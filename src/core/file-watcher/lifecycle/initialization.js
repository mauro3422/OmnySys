import path from 'path';
import { existsSync } from 'fs';
import {
  getPersistedKnownFilePaths,
  loadPersistedScannedFilePaths
} from '../../../shared/compiler/index.js';
import { createLogger } from '../../../utils/logger.js';
import { createSmartBatchProcessor } from '../batch-processor/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

const logger = createLogger('file-watcher');
const ORPHAN_CHECK_INTERVAL_MS = 30000; // Every 30 seconds

/**
 * Inicializa el file watcher
 */
export async function initialize() {
  if (this.options.verbose) {
    logger.info('FileWatcher initializing...');
  }

  if (this.options.useSmartBatch && !this.batchProcessor) {
    this.batchProcessor = createSmartBatchProcessor({
      debounceMs: this.options.debounceMs,
      maxConcurrent: this.options.maxConcurrent,
      verbose: this.options.verbose
    });
  }

  // Cargar estado actual del proyecto (hashes para dedup)
  await this.loadCurrentState();

  this.isRunning = true;

  if (this.options.verbose) {
    logger.info('FileWatcher ready', {
      debounce: this.options.debounceMs,
      maxConcurrent: this.options.maxConcurrent
    });
  }

  // Iniciar watching del filesystem
  this.startWatching();

  if (!this.processingInterval) {
    this.processingInterval = setInterval(() => {
      this.processPendingChanges().catch((error) => {
        logger.error('FileWatcher processing loop failed:', error);
      });
    }, this.options.batchDelayMs);
  }

  // Periodic orphan cleanup: mark DB files as removed if they no longer exist on disk
  if (this.orphanCheckInterval) {
    clearInterval(this.orphanCheckInterval);
  }
  this.orphanCheckInterval = setInterval(() => {
    this._checkOrphanedFiles().catch((error) => {
      logger.error('FileWatcher orphan check failed:', error);
    });
  }, ORPHAN_CHECK_INTERVAL_MS);
  logger.info(`[ORPHAN CHECK] Interval set up: every ${ORPHAN_CHECK_INTERVAL_MS / 1000}s`);

  this.emit('ready');
}

/**
 * Carga el estado actual del proyecto
 */
export async function loadCurrentState() {
  try {
    const [knownPaths, manifestPaths] = await Promise.all([
      getPersistedKnownFilePaths(this.rootPath),
      loadPersistedScannedFilePaths(this.rootPath)
    ]);

    const trackedPaths = manifestPaths?.size
      ? Array.from(manifestPaths)
      : Array.from(knownPaths || []);

    // Cargar hashes/snapshots del universo escaneado. Si solo usamos el live
    // index, los zero-atom/barrels quedan sin baseline y cualquier burst del
    // runtime path puede promoverse falsamente a "modified".
    let count = 0;

    for (const filePath of trackedPaths) {
      const fullPath = path.join(this.rootPath, filePath);
      const hash = await this._calculateContentHash(fullPath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }
      try {
        const fs = await import('fs/promises');
        const stats = await fs.stat(fullPath);
        this.fileStats.set(filePath, {
          mtimeMs: stats.mtimeMs,
          size: stats.size
        });
      } catch {
        // Ignore missing/unreadable files during bootstrap.
      }

      // Yield al event loop cada 50 archivos para no bloquear
      if (++count % 50 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    if (this.options.verbose) {
      logger.info(`Tracking ${trackedPaths.length} files (${this.fileHashes.size} with content hash)`);
    }
  } catch (error) {
    if (this.options.verbose) {
      logger.info('No existing analysis found, starting fresh');
    }
  }
}

/**
 * Periodic orphan cleanup: marks DB files as removed if they no longer exist on disk.
 * This is a safety net for Windows where chokidar may not emit 'unlink' reliably.
 */
export async function _checkOrphanedFiles() {
  logger.info(`[ORPHAN CHECK] Running periodic check for ${this.rootPath}...`);
  try {
    const repo = getRepository(this.rootPath);
    logger.info(`[ORPHAN CHECK] repo=${!!repo}, initialized=${repo?.initialized}, dbOpen=${repo?.db?.open}`);
    if (!repo?.initialized || !repo?.db || repo.db.open === false) {
      logger.warn('[ORPHAN CHECK] Repository not ready, skipping');
      return;
    }

    const files = repo.db.prepare(
      'SELECT path FROM files WHERE is_removed = 0'
    ).all();

    if (!files || files.length === 0) return;

    const orphanedPaths = [];
    for (const file of files) {
      const fullPath = path.join(this.rootPath, file.path);
      if (!existsSync(fullPath)) {
        orphanedPaths.push(file.path);
      }
    }

    if (orphanedPaths.length === 0) return;

    logger.info(`[ORPHAN CHECK] Found ${orphanedPaths.length} orphaned file(s) in DB, marking as removed...`);

    for (const filePath of orphanedPaths) {
      try {
        repo.db.prepare(
          "UPDATE files SET is_removed = 1, updated_at = datetime('now') WHERE path = ? AND is_removed = 0"
        ).run(filePath);

        repo.db.prepare(
          "UPDATE atoms SET is_removed = 1, updated_at = datetime('now') WHERE file_path = ? AND is_removed = 0"
        ).run(filePath);

        const changes = repo.db.prepare(
          "UPDATE atom_relations SET is_removed = 1, updated_at = datetime('now') WHERE file_path = ? AND is_removed = 0"
        ).run(filePath);

        logger.info(`[ORPHAN MARKED] ${filePath} (${changes.changes} relations marked as removed)`);
      } catch (error) {
        logger.warn(`[ORPHAN MARK FAIL] ${filePath}: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`[ORPHAN CHECK] Failed: ${error.message}`);
  }
}

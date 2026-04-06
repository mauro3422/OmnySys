import path from 'path';
import {
  getPersistedKnownFilePaths,
  loadPersistedScannedFilePaths
} from '../../../shared/compiler/index.js';
import { createLogger } from '../../../utils/logger.js';
import { createSmartBatchProcessor } from '../batch-processor/index.js';
import { checkOrphanedFiles } from './orphan-cleanup.js';

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

  // Periodic orphan cleanup via dedicated service boundary
  if (this.orphanCheckInterval) {
    clearInterval(this.orphanCheckInterval);
  }
  this.orphanCheckInterval = setInterval(() => {
    checkOrphanedFiles(this.rootPath).catch((error) => {
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

import fs from 'fs/promises';
import path from 'path';

import { createLogger } from '../../utils/logger.js';
import { invalidateFileCacheEntries } from '../cache/manager/cache-key-helpers.js';

const logger = createLogger('OmnySys:orchestrator:runtime-ops');

/**
 * Sincroniza archivos del proyecto con el análisis existente
 * Agrega archivos nuevos o modificados a la cola
 */
export async function _syncProjectFiles() {
  try {
    const { scanProject } = await import('../../layer-a-static/scanner.js');
    const projectFiles = await scanProject(this.projectPath);

    if (projectFiles.length === 0) return;

    const analyzedFiles = new Set();
    try {
      const indexPath = path.join(this.OmnySysDataPath, 'index.json');
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);
      for (const file of index.files || []) {
        analyzedFiles.add(file.filePath);
      }
    } catch {
      // No hay índice, todos los archivos son nuevos
    }

    const normalizedProjectFiles = projectFiles.map(file =>
      path.relative(this.projectPath, path.resolve(this.projectPath, file)).replace(/\\/g, '/')
    );

    const missingFiles = normalizedProjectFiles.filter(filePath => !analyzedFiles.has(filePath));

    if (missingFiles.length > 0) {
      logger.info(`📋 Found ${missingFiles.length} new files to analyze`);

      for (const filePath of missingFiles) {
        this.queue.enqueue(filePath, 'low');
        this.stats.totalQueued++;
      }

      logger.info(`✅ Added ${missingFiles.length} files to analysis queue`);
    }

    const queueSize = this.queue.size();
    if (queueSize > 0) {
      logger.info(`📊 Queue: ${queueSize} files pending analysis`);
    }
  } catch (error) {
    logger.warn('⚠️  Failed to sync project files:', error.message);
  }
}

/**
 * Invalidates orchestrator cache for a file.
 * Uses CacheInvalidator when available, with a safe legacy fallback.
 *
 * @param {string} filePath - Ruta del archivo a invalidar
 */
export async function _invalidateFileCache(filePath) {
  try {
    const relativePath = path.relative(this.projectPath, path.resolve(this.projectPath, filePath));
    const normalizedPath = relativePath.replace(/\\/g, '/');

    const hasCacheIndex =
      !!this.cache &&
      !!this.cache.index &&
      !!this.cache.index.entries;

    if (hasCacheIndex && typeof this._getCacheInvalidator === 'function') {
      const invalidator = await this._getCacheInvalidator();
      const result = await invalidator.invalidateSync(normalizedPath);

      this.indexedFiles.delete(normalizedPath);

      if (result?.success) {
        logger.debug(`🗑️  Invalidated cache for: ${normalizedPath}`);
        return;
      }

      logger.warn(`⚠️  CacheInvalidator failed for ${normalizedPath}, using legacy fallback`);
    }

    if (this.cache) {
      invalidateFileCacheEntries(this.cache, normalizedPath);
    }

    const fileDataPath = path.join(this.OmnySysDataPath, 'files', normalizedPath + '.json');
    try {
      await fs.unlink(fileDataPath);
    } catch {
      // Archivo no existía, ignorar
    }

    this.indexedFiles.delete(normalizedPath);
    logger.debug(`🗑️  Invalidated cache for: ${normalizedPath} (legacy fallback)`);
  } catch (e) {
    logger.debug(`[InvalidateCache] Error for ${filePath}: ${e.message}`);
  }
}

/**
 * Dispara una actualización incremental de sociedades para un archivo.
 */
export async function _triggerIncrementalSocietyUpdate(filePath) {
  const relativePath = path.isAbsolute(filePath) ? path.relative(this.projectPath, filePath).replace(/\\/g, '/') : filePath;

  logger.info(`🏘️  Triggering incremental society update for: ${relativePath}`);

  try {
    const db = this.repo?.db;
    if (db) {
      db.prepare('UPDATE societies SET updated_at = ? WHERE id IN (SELECT id FROM societies WHERE metadata_json LIKE ?)')
        .run(new Date().toISOString(), `%${relativePath}%`);
    }

    this.emit('society:stale', { filePath: relativePath });
  } catch (e) {
    logger.debug(`[SocietyUpdate] Incremental hook failed: ${e.message}`);
  }
}

/**
 * Ejecuta guardias de integridad de la pipeline tras un análisis.
 */
export async function _runPipelineGuard(filePath, analysisResult) {
  const { pipelineAlertGuard } = await import('../file-watcher/guards/pipeline-alert-guard.js');
  try {
    await pipelineAlertGuard.run(this.projectPath, filePath, this.fileWatcher, analysisResult);
  } catch (e) {
    logger.debug(`[PipelineGuard] Execution failed: ${e.message}`);
  }
}

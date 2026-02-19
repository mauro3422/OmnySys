import fs from 'fs/promises';
import path from 'path';

import { LLMService } from '../../services/llm-service/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:helpers');



/**
 * Check if a file has been analyzed
 */
export async function isAnalyzed(filePath) {
  try {
    const fileData = await this._getFileData(filePath);
    return !!fileData;
  } catch {
    return false;
  }
}

/**
 * Get current status
 */
export function getStatus() {
  return {
    isRunning: this.isRunning,
    isIndexing: this.isIndexing,
    indexingProgress: this.indexingProgress,
    currentJob: this.currentJob,
    queueSize: this.queue.size(),
    stats: this.stats,
    uptime: Date.now() - this.startTime
  };
}

export async function _hasExistingAnalysis() {
  try {
    const indexPath = path.join(this.OmnySysDataPath, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

export async function _getFileData(filePath) {
  // Try to read from .OmnySysData
  try {
    const relativePath = path.relative(this.projectPath, filePath);
    const fileDataPath = path.join(
      this.OmnySysDataPath,
      'files',
      relativePath + '.json'
    );
    const content = await fs.readFile(fileDataPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function _ensureLLMAvailable() {
  try {
    const service = await LLMService.getInstance();
    return service.isAvailable();
  } catch {
    return false;
  }
}

export function _calculateChangePriority(change) {
  if (change.changeType === 'deleted') return 'critical';
  if (change.changeType === 'created') return 'high';
  if (change.priority >= 4) return 'critical';
  if (change.priority === 3) return 'high';
  if (change.priority === 2) return 'medium';
  return 'low';
}

/**
 * Sincroniza archivos del proyecto con el análisis existente
 * Agrega archivos nuevos o modificados a la cola
 */
export async function _syncProjectFiles() {
  try {
    // Importar scanner dinámicamente
    const { scanProject } = await import('../../layer-a-static/scanner.js');
    const projectFiles = await scanProject(this.projectPath);

    if (projectFiles.length === 0) return;

    // Obtener lista de archivos ya analizados desde el índice
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

    // Normalizar rutas del proyecto (scanProject ya devuelve rutas relativas)
    const normalizedProjectFiles = projectFiles.map(file =>
      path.relative(this.projectPath, path.resolve(this.projectPath, file)).replace(/\\/g, '/')
    );

    // Encontrar archivos faltantes
    const missingFiles = normalizedProjectFiles.filter(filePath => {
      return !analyzedFiles.has(filePath);
    });

    if (missingFiles.length > 0) {
      logger.info(`ðŸ“‹ Found ${missingFiles.length} new files to analyze`);

      // Agregar a la cola con prioridad baja
      for (const filePath of missingFiles) {
        this.queue.enqueue(filePath, 'low');
        this.stats.totalQueued++;
      }

      logger.info(`âœ… Added ${missingFiles.length} files to analysis queue`);
    }

    // Reportar estado
    const queueSize = this.queue.size();
    if (queueSize > 0) {
      logger.info(`ðŸ“Š Queue: ${queueSize} files pending analysis`);
    }
  } catch (error) {
    logger.warn('⚠️  Failed to sync project files:', error.message);
  }
}

/**
 * ⚠️ DEPRECADO: Usar CacheInvalidator.invalidateSync() en su lugar
 * 
 * Esta función ha sido reemplazada por el sistema de CacheInvalidator
 * que proporciona invalidación síncrona, atómica y con rollback.
 * 
 * Se mantiene por compatibilidad con código legacy, pero se recomienda
 * usar el nuevo sistema en src/core/cache-invalidator/
 * 
 * @deprecated Usar CacheInvalidator.invalidateSync()
 * @param {string} filePath - Ruta del archivo a invalidar
 */
export async function _invalidateFileCache(filePath) {
  logger.warn('⚠️  _invalidateFileCache() is deprecated. Use CacheInvalidator.invalidateSync() instead.');
  try {
    const relativePath = path.relative(this.projectPath, path.resolve(this.projectPath, filePath));
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    // Eliminar del caché del UnifiedCacheManager
    if (this.cache) {
      this.cache.invalidate(`analysis:${normalizedPath}`);
      this.cache.invalidate(`atom:${normalizedPath}`);
    }
    
    // Eliminar archivo de análisis de .omnysysdata/files/
    const fileDataPath = path.join(this.OmnySysDataPath, 'files', normalizedPath + '.json');
    try {
      await fs.unlink(fileDataPath);
      logger.info(`🗑️  Invalidated cache for: ${normalizedPath}`);
    } catch {
      // Archivo no existía, ignorar
    }
    
    // Marcar como no indexado para forzar re-análisis
    this.indexedFiles.delete(normalizedPath);
    
  } catch (error) {
    logger.warn(`⚠️  Failed to invalidate cache for ${filePath}:`, error.message);
  }
}

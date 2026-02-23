/**
 * Change detection utilities - Usa hashes de contenido en lugar de timestamps
 * @module mcp/core/analysis-checker/change-detector
 */

import { scanCurrentFiles } from './file-scanner.js';
import { detectRealChanges } from '../../../../layer-c-memory/storage/cache/hash-cache.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:analysis:checker');

/**
 * Detectar cambios entre proyecto y cache usando hashes de contenido
 * @param {string} projectPath - Project root path
 * @param {Object} metadata - Project metadata (ya no se usa, mantenido para compatibilidad)
 * @returns {Promise<Object>} - Changes object
 */
export async function detectCacheChanges(projectPath, metadata) {
  try {
    const currentFiles = await scanCurrentFiles(projectPath);
    const filePaths = currentFiles.map(f => f.path);
    
    // Usar sistema de hash cache persistente
    const changes = await detectRealChanges(projectPath, filePaths, true);
    
    return changes;
  } catch (error) {
    logger.warn('   ⚠️  Failed to detect cache changes:', error.message);
    return { newFiles: [], modifiedFiles: [], deletedFiles: [], unchangedFiles: [], error: true };
  }
}

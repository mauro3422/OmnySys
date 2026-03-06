/**
 * Change detection utilities - Usa hashes de contenido en lugar de timestamps
 * @module mcp/core/analysis-checker/change-detector
 */

import { scanCurrentFiles, getIndexedFilePaths } from './file-scanner.js';
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
    const indexedFiles = await getIndexedFilePaths(projectPath);
    
    // Usar sistema de hash cache persistente
    const changes = await detectRealChanges(projectPath, filePaths, true);

    // Si un archivo ya tiene hash pero nunca llegó a persistirse en files/atoms,
    // debe tratarse como "new" para evitar que quede invisibilizado para siempre.
    const orphanedByIndex = filePaths.filter((filePath) => !indexedFiles.has(filePath));
    if (orphanedByIndex.length > 0) {
      const orphanedSet = new Set(orphanedByIndex);

      changes.unchangedFiles = changes.unchangedFiles.filter((filePath) => !orphanedSet.has(filePath));
      changes.modifiedFiles = changes.modifiedFiles.filter((filePath) => !orphanedSet.has(filePath));

      for (const filePath of orphanedByIndex) {
        if (!changes.newFiles.includes(filePath)) {
          changes.newFiles.push(filePath);
        }
      }

      logger.warn(`   ⚠️  Recovered ${orphanedByIndex.length} file(s) present in hash cache but missing from the persisted index`);
    }
    
    return changes;
  } catch (error) {
    logger.warn('   ⚠️  Failed to detect cache changes:', error.message);
    return { newFiles: [], modifiedFiles: [], deletedFiles: [], unchangedFiles: [], error: true };
  }
}

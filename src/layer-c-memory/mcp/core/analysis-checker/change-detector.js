/**
 * Change detection utilities - Usa hashes de contenido en lugar de timestamps
 * @module mcp/core/analysis-checker/change-detector
 */

import { scanCurrentFiles } from './file-scanner.js';
import { detectRealChanges } from '../../../../layer-c-memory/storage/cache/hash-cache.js';
import { createLogger } from '../../../../utils/logger.js';
import {
  collectDiscoveredFilePaths,
  getPersistedKnownFilePaths,
  reconcilePersistedManifestCoverage,
  summarizePersistedManifestDrift,
  syncPersistedScannedFileManifest
} from '../../../../shared/compiler/index.js';

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
    const filePaths = collectDiscoveredFilePaths(currentFiles);

    await syncPersistedScannedFileManifest(projectPath, filePaths);

    const indexedFiles = await getPersistedKnownFilePaths(projectPath);
    const changes = await detectRealChanges(projectPath, filePaths, true);

    const manifestRecovery = reconcilePersistedManifestCoverage(changes, filePaths, indexedFiles);
    if (manifestRecovery.recoveredCount > 0) {
      logger.warn(`   Warning: recovered ${manifestRecovery.recoveredCount} file(s) present in hash cache but missing from the persisted manifest`);
    }

    const manifestDrift = await summarizePersistedManifestDrift(projectPath, filePaths);
    if (manifestDrift.missingFileCount > 0) {
      logger.warn(`   Warning: persisted scanned-file manifest is missing ${manifestDrift.missingFileCount} file(s) after sync`);
    }

    return changes;
  } catch (error) {
    logger.warn('   Warning: failed to detect cache changes:', error.message);
    return { newFiles: [], modifiedFiles: [], deletedFiles: [], unchangedFiles: [], error: true };
  }
}

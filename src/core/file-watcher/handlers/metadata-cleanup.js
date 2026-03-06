/**
 * @fileoverview metadata-cleanup.js
 * 
 * Limpieza de metadata y atomos cuando se borran archivos.
 * 
 * @module file-watcher/handlers/metadata-cleanup
 */

import { createLogger } from '../../../utils/logger.js';
import {
  emitOrphanedImportsFromPersistedMetadata,
  removePersistedAtomMetadata,
  removePersistedFileMetadata
} from '../../../shared/compiler/index.js';

const logger = createLogger('OmnySys:file-watcher:cleanup');

/**
 * Borra metadata del archivo en SQLite
 */
export async function removeFileMetadata(filePath) {
  try {
    const result = await removePersistedFileMetadata(this.rootPath, filePath);

    if (result) {
      logger.debug(`[DELETED FILE META] ${filePath} from SQLite`);
    }
  } catch (error) {
    logger.warn(`[DELETE FILE META FAIL] ${filePath}:`, error.message);
  }
}

/**
 * Borra atomos asociados al archivo en SQLite
 */
export async function removeAtomMetadata(filePath) {
  try {
    const count = await removePersistedAtomMetadata(this.rootPath, filePath);

    if (count > 0) {
      logger.debug(`[DELETED ATOMS] ${count} atoms for ${filePath} from SQLite`);
    }
  } catch (error) {
    logger.warn(`[DELETE ATOMS FAIL] ${filePath}:`, error.message);
  }
}

/**
 * Limpia relaciones del archivo con otros modulos.
 * Emite eventos 'import:orphaned' para que otros subsistemas reaccionen.
 */
export async function cleanupRelationships(filePath) {
  logger.debug(`[CLEANUP RELATIONS] ${filePath}`);
  const importsCount = await emitOrphanedImportsFromPersistedMetadata(
    this.dataPath,
    filePath,
    (payload) => this.emit('import:orphaned', payload)
  );

  if (importsCount > 0) {
    logger.debug(`  ${filePath} had ${importsCount} import(s) - emitting import:orphaned`);
  } else {
    logger.debug(`  No metadata for ${filePath}, skip relationship cleanup`);
  }
}

export default {
  removeFileMetadata,
  removeAtomMetadata,
  cleanupRelationships
};

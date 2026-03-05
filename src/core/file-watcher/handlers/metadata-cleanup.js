/**
 * @fileoverview metadata-cleanup.js
 * 
 * Limpieza de metadata y atomos cuando se borran archivos.
 * 
 * @module file-watcher/handlers/metadata-cleanup
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:cleanup');

/**
 * Borra metadata del archivo en SQLite
 */
export async function removeFileMetadata(filePath) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(this.rootPath);
    const result = await repo.deleteFile(filePath);

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
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(this.rootPath);
    const count = await repo.deleteByFile(filePath);

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

  const fileName = path.basename(filePath);
  const fileDir = path.dirname(filePath);
  const metadataPath = path.join(this.dataPath, 'files', fileDir, `${fileName}.json`);

  try {
    const content = await fs.readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content);
    const imports = metadata.imports || [];

    if (imports.length > 0) {
      logger.debug(`  ${filePath} had ${imports.length} import(s) - emitting import:orphaned`);
      for (const imported of imports) {
        const importedPath = typeof imported === 'string' ? imported : (imported.path || imported.from || '');
        if (importedPath) {
          this.emit('import:orphaned', {
            importer: filePath,
            imported: importedPath,
            reason: 'importer_deleted'
          });
        }
      }
    }
  } catch {
    logger.debug(`  No metadata for ${filePath}, skip relationship cleanup`);
  }
}

export default {
  removeFileMetadata,
  removeAtomMetadata,
  cleanupRelationships
};

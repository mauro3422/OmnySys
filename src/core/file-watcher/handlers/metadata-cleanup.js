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
 * Borra metadata del archivo en .omnysysdata/files/
 */
export async function removeFileMetadata(filePath) {
  const metadataPath = path.join(this.dataPath, 'files', filePath) + '.json';

  try {
    await fs.unlink(metadataPath);
    logger.debug(`[DELETED META] ${metadataPath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn(`[DELETE META FAIL] ${filePath}:`, error.message);
    }
  }
}

/**
 * Borra atomos asociados al archivo
 */
export async function removeAtomMetadata(filePath) {
  const atomsDir = path.join(this.dataPath, 'atoms');
  const fileDir = path.dirname(filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  const atomDirPath = path.join(atomsDir, fileDir, fileName);

  try {
    await fs.access(atomDirPath);
    const atoms = await fs.readdir(atomDirPath);
    
    for (const atom of atoms) {
      await fs.unlink(path.join(atomDirPath, atom));
    }
    
    await fs.rmdir(atomDirPath);
    logger.debug(`[DELETED ATOMS] ${atoms.length} atoms for ${filePath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn(`[DELETE ATOMS FAIL] ${filePath}:`, error.message);
    }
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

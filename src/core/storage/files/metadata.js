import fs from 'fs/promises';
import path from 'path';
import { createDataDirectory } from '../setup/directory.js';

const DATA_DIR = '.omnysysdata';

/**
 * Guarda metadata global del proyecto + índice de archivos
 *
 * @param {string} rootPath - Raíz del proyecto
 * @param {object} metadata - Metadata del análisis
 * @param {object} fileIndex - Índice de archivos analizados
 * @returns {string} - Ruta del archivo guardado
 */
export async function saveMetadata(rootPath, metadata, fileIndex) {
  const dataPath = await createDataDirectory(rootPath);

  const indexData = {
    metadata: {
      ...metadata,
      analyzedAt: new Date().toISOString(),
      storageVersion: '1.0.0',
      storageFormat: 'partitioned'
    },
    fileIndex: fileIndex || {}
  };

  const indexPath = path.join(dataPath, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));

  return indexPath;
}

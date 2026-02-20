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
  const tmpPath = indexPath + '.tmp';

  // Escritura atómica: escribir a .tmp y renombrar, para que index.json
  // nunca quede en estado parcial si el proceso es interrumpido mid-write.
  await fs.writeFile(tmpPath, JSON.stringify(indexData, null, 2));
  await fs.rename(tmpPath, indexPath);

  return indexPath;
}

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = '.omnysysdata';

/**
 * Crea la estructura de directorios de .omnysysdata/
 *
 * @param {string} rootPath - Raíz del proyecto
 * @returns {string} - Ruta del directorio de datos creado
 */
export async function createDataDirectory(rootPath) {
  const dataPath = path.join(rootPath, DATA_DIR);

  await fs.mkdir(dataPath, { recursive: true });
  await fs.mkdir(path.join(dataPath, 'files'), { recursive: true });
  await fs.mkdir(path.join(dataPath, 'connections'), { recursive: true });
  await fs.mkdir(path.join(dataPath, 'risks'), { recursive: true });

  return dataPath;
}

/**
 * Obtiene la ruta del directorio .omnysysdata/
 *
 * @param {string} rootPath - Raíz del proyecto
 * @returns {string} - Ruta del directorio de datos
 */
export function getDataDirectory(rootPath) {
  return path.join(rootPath, DATA_DIR);
}

/**
 * Verifica si existe análisis previo
 *
 * @param {string} rootPath - Raíz del proyecto
 * @returns {boolean} - true si existe análisis previo
 */
export async function hasExistingAnalysis(rootPath) {
  try {
    const dataPath = getDataDirectory(rootPath);
    const indexPath = path.join(dataPath, 'index.json');
    await fs.access(indexPath);
    return true;
  } catch {
    return false;
  }
}

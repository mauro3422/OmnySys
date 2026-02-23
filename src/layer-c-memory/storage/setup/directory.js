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

  // Solo crear directorio raíz - SQLite maneja todo internamente
  await fs.mkdir(dataPath, { recursive: true });

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
 * Ahora verifica el archivo SQLite en lugar de index.json
 *
 * @param {string} rootPath - Raíz del proyecto
 * @returns {boolean} - true si existe análisis previo
 */
export async function hasExistingAnalysis(rootPath) {
  try {
    const dataPath = getDataDirectory(rootPath);
    // Verificar archivo SQLite principal
    const dbPath = path.join(dataPath, 'omnysys.db');
    await fs.access(dbPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @fileoverview script-utils.js
 *
 * Utilidades compartidas para scripts de análisis/auditoría.
 * Evita duplicación de funciones comunes.
 *
 * @module scripts/utils
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Lee todos los átomos desde el directorio .omnysysdata/atoms
 * @param {string} rootPath - Ruta raíz del proyecto
 * @returns {Promise<Map>} Mapa de átomos
 */
export async function readAllAtoms(rootPath) {
  const atomsDir = path.join(rootPath, '.omnysysdata', 'atoms');
  const atoms = new Map();

  try {
    const files = await fs.readdir(atomsDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(atomsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const atom = JSON.parse(content);

      if (atom.id) {
        atoms.set(atom.id, { data: atom, path: filePath });
      }
    }
  } catch (error) {
    console.error('Error reading atoms:', error.message);
  }

  return atoms;
}

/**
 * Lee todos los archivos desde el directorio .omnysysdata/files
 * @param {string} rootPath - Ruta raíz del proyecto
 * @returns {Promise<Map>} Mapa de archivos
 */
export async function readAllFiles(rootPath) {
  const filesDir = path.join(rootPath, '.omnysysdata', 'files');
  const files = new Map();

  try {
    const fileItems = await fs.readdir(filesDir);
    for (const file of fileItems) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(filesDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const fileData = JSON.parse(content);

      if (fileData.path) {
        files.set(fileData.path, fileData);
      }
    }
  } catch (error) {
    console.error('Error reading files:', error.message);
  }

  return files;
}

/**
 * Escanea un directorio recursivamente
 * @param {string} dir - Directorio a escanear
 * @param {string} [extension='.js'] - Extensión a buscar
 * @returns {Promise<string[]>} Lista de archivos
 */
export async function scanDir(dir, extension = '.js') {
  const results = [];

  try {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        if (item !== 'node_modules' && !item.startsWith('.')) {
          const subResults = await scanDir(fullPath, extension);
          results.push(...subResults);
        }
      } else if (item.endsWith(extension)) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dir}:`, error.message);
  }

  return results;
}

/**
 * Lee un archivo JSON de forma segura
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<Object|null>} Contenido parseado o null
 */
export async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Escribe un archivo JSON de forma segura
 * @param {string} filePath - Ruta del archivo
 * @param {Object} data - Datos a escribir
 * @returns {Promise<boolean>} True si éxito
 */
export async function writeJsonFile(filePath, data) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

export default {
  readAllAtoms,
  readAllFiles,
  scanDir,
  readJsonFile,
  writeJsonFile
};

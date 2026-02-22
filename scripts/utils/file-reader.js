/**
 * Utilidades de lectura de archivos consolidadas
 * Reemplaza duplicados en scripts/
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Lee todos los archivos de metadata de un directorio
 * @param {string} rootPath - Ruta raíz del proyecto
 * @returns {Promise<Map>} Mapa de archivos indexados por ruta
 */
export async function readAllFiles(rootPath) {
  const filesDir = path.join(rootPath, '.omnysysdata', 'files');
  const files = new Map();
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);
            const filePath = data.path || data.filePath;
            if (filePath) {
              files.set(filePath, data);
            }
          } catch {
            // Skip invalid files
          }
        }
      }
    } catch {
      // Directory might not exist
    }
  }
  
  await scanDir(filesDir);
  return files;
}

/**
 * Lee todos los átomos del proyecto
 * @param {string} rootPath - Ruta raíz del proyecto  
 * @returns {Promise<Array>} Lista de átomos
 */
export async function readAllAtoms(rootPath) {
  const atomsDir = path.join(rootPath, '.omnysysdata', 'atoms');
  const atoms = [];
  
  async function scanDir(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);
            if (data.atoms) {
              atoms.push(...data.atoms);
            } else if (data.name) {
              atoms.push(data);
            }
          } catch {
            // Skip invalid files
          }
        }
      }
    } catch {
      // Directory might not exist
    }
  }
  
  await scanDir(atomsDir);
  return atoms;
}

/**
 * Escanea directorios recursivamente
 * @param {string} dir - Directorio a escanear
 * @returns {Promise<Array>} Lista de nombres de subdirectorios
 */
export async function scanDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = [];
  
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      result.push(entry.name);
    }
  }
  
  return result;
}
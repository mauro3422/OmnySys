/**
 * @fileoverview File scanning utilities
 * @module verification/validators/integrity/utils/file-scanner
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Obtiene todos los archivos JSON recursivamente
 * @param {string} dir - Directorio a escanear
 * @param {string} baseDir - Directorio base para rutas relativas
 * @returns {Promise<string[]>} Lista de archivos JSON (rutas relativas)
 */
export async function getJsonFiles(dir, baseDir = dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getJsonFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(path.relative(baseDir, fullPath));
    }
  }

  return files;
}

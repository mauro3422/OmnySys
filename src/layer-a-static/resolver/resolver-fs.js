/**
 * @fileoverview Resolver - File Utilities
 *
 * Utilidades para operaciones de filesystem.
 *
 * @module layer-a-static/resolver/resolver-fs
 */

import fs from 'fs/promises';
import path from 'path';

const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.json'];

/**
 * Verifica si un archivo existe
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Busca archivo con diferentes extensiones
 * @param {string} basePath - Ruta base
 * @returns {Promise<string|null>}
 */
export async function findFileWithExtension(basePath) {
  if (await fileExists(basePath)) {
    return basePath;
  }

  const hasExtension = SUPPORTED_EXTENSIONS.some(ext => basePath.endsWith(ext));
  if (hasExtension) {
    return null;
  }

  for (const ext of SUPPORTED_EXTENSIONS) {
    const filePath = basePath + ext;
    if (await fileExists(filePath)) {
      return filePath;
    }
  }

  for (const ext of SUPPORTED_EXTENSIONS) {
    const indexPath = path.join(basePath, `index${ext}`);
    if (await fileExists(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Normaliza ruta a relativa del proyecto
 * @param {string} filePath - Ruta absoluta
 * @param {string} projectRoot - Raíz del proyecto
 * @returns {string}
 */
export function normalizeToProjectRelative(filePath, projectRoot) {
  const normalized = path.normalize(filePath);
  const relative = path.relative(projectRoot, normalized);
  return relative.replace(/\\/g, '/');
}

export default {
  fileExists,
  findFileWithExtension,
  normalizeToProjectRelative,
  SUPPORTED_EXTENSIONS
};

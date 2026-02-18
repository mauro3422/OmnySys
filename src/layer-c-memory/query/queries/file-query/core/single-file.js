/**
 * @fileoverview Single file analysis queries
 * @module query/queries/file-query/core/single-file
 */

import path from 'path';
import { getDataDirectory } from '#layer-c/storage/index.js';
import { readJSON } from '#layer-c/query/readers/json-reader.js';

/**
 * Normalizes file path to be relative to root
 * @param {string} rootPath - Project root
 * @param {string} filePath - File path (absolute or relative)
 * @returns {string} - Normalized relative path
 */
function normalizeFilePath(rootPath, filePath) {
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    return null;
  }
  
  let normalizedPath = filePath;
  const normalizedFilePath = filePath.replace(/\\/g, '/');
  const normalizedRootPath = rootPath.replace(/\\/g, '/');

  if (path.isAbsolute(filePath) && normalizedFilePath.startsWith(normalizedRootPath)) {
    normalizedPath = path.relative(rootPath, filePath);
  }

  return normalizedPath;
}

/**
 * Obtiene el análisis completo de un archivo específico
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {Promise<object>} - Datos completos del archivo
 */
export async function getFileAnalysis(rootPath, filePath) {
  const normalizedPath = normalizeFilePath(rootPath, filePath);
  
  if (!normalizedPath) {
    return null;
  }
  
  const dataPath = getDataDirectory(rootPath).replace(/\\/g, '/');
  const filePart = path.posix.join(dataPath, 'files', normalizedPath.replace(/\\/g, '/') + '.json');
  return await readJSON(filePart);
}

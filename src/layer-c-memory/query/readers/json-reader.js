/**
 * @fileoverview json-reader.js
 * 
 * Lectura segura de archivos JSON
 * 
 * @module query/readers/json-reader
 */

import fs from 'fs/promises';
import { fileExists as resolverFileExists } from '../../../layer-a-static/resolver/resolver-fs.js';

/**
 * Verifica si un archivo existe
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>} - true si existe
 */
export async function fileExists(filePath) {
  return resolverFileExists(filePath);
}

/**
 * Lee un archivo JSON de forma segura
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<object>} - Contenido parseado
 */
export async function readJSON(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return null;
  }
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      return null;
    }
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

/**
 * Lee múltiples archivos JSON en paralelo
 * @param {string[]} filePaths - Rutas de archivos
 * @returns {Promise<object[]>} - Array de contenidos
 */
export async function readMultipleJSON(filePaths) {
  try {
    return await Promise.all(filePaths.map(readJSON));
  } catch (error) {
    throw new Error(`Failed to read multiple JSON files: ${error.message}`);
  }
}

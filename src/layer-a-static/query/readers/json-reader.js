/**
 * @fileoverview json-reader.js
 * 
 * Lectura segura de archivos JSON
 * 
 * @module query/readers/json-reader
 */

import fs from 'fs/promises';

/**
 * Lee un archivo JSON de forma segura
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<object>} - Contenido parseado
 */
export async function readJSON(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

/**
 * Lee múltiples archivos JSON en paralelo
 * @param {string[]} filePaths - Rutas de archivos
 * @returns {Promise<object[]>} - Array de contenidos
 */
export async function readMultipleJSON(filePaths) {
  return Promise.all(filePaths.map(readJSON));
}

/**
 * Verifica si un archivo existe antes de leer
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @fileoverview file-query.js
 * 
 * Consultas a nivel de archivo
 * 
 * @module query/queries/file-query
 */

import path from 'path';
import { getDataDirectory } from '../../storage/storage-manager.js';
import { readJSON } from '../readers/json-reader.js';

/**
 * Obtiene el análisis completo de un archivo específico
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta relativa del archivo
 * @returns {Promise<object>} - Datos completos del archivo
 */
export async function getFileAnalysis(rootPath, filePath) {
  const dataPath = getDataDirectory(rootPath);
  
  // Sanitizar el filePath para evitar directory traversal
  const safeFilePath = filePath.replace(/\./g, '_').replace(/\//g, '_');
  const partitionPath = path.join(dataPath, 'partitions', `${safeFilePath}.json`);
  
  return await readJSON(partitionPath);
}

/**
 * Obtiene análisis de múltiples archivos
 * @param {string} rootPath - Raíz del proyecto
 * @param {string[]} filePaths - Rutas de archivos
 * @returns {Promise<object[]>}
 */
export async function getMultipleFileAnalysis(rootPath, filePaths) {
  return Promise.all(
    filePaths.map(fp => getFileAnalysis(rootPath, fp).catch(() => null))
  );
}

/**
 * Obtiene dependencias de un archivo
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string[]>}
 */
export async function getFileDependencies(rootPath, filePath) {
  const analysis = await getFileAnalysis(rootPath, filePath);
  return analysis?.imports?.map(imp => imp.source) || [];
}

/**
 * Obtiene dependientes de un archivo
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string[]>}
 */
export async function getFileDependents(rootPath, filePath) {
  const analysis = await getFileAnalysis(rootPath, filePath);
  return analysis?.usedBy || [];
}

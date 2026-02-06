/**
 * @fileoverview project-query.js
 * 
 * Consultas a nivel de proyecto
 * 
 * @module query/queries/project-query
 */

import path from 'path';
import { getDataDirectory } from '../../storage/storage-manager.js';
import { readJSON } from '../readers/json-reader.js';

/**
 * Obtiene metadata global del proyecto
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>} - Metadata + file index
 */
export async function getProjectMetadata(rootPath) {
  const dataPath = getDataDirectory(rootPath);
  const indexPath = path.join(dataPath, 'index.json');
  return await readJSON(indexPath);
}

/**
 * Obtiene lista de archivos analizados
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<string[]>} - Lista de rutas
 */
export async function getAnalyzedFiles(rootPath) {
  const metadata = await getProjectMetadata(rootPath);
  return metadata.files || [];
}

/**
 * Obtiene estadísticas del proyecto
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>} - Estadísticas
 */
export async function getProjectStats(rootPath) {
  const metadata = await getProjectMetadata(rootPath);
  return metadata.stats || {};
}

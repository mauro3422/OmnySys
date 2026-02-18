/**
 * @fileoverview project-query.js
 * 
 * Consultas a nivel de proyecto
 * 
 * @module query/queries/project-query
 */

import path from 'path';
import { getDataDirectory } from '#core/storage/index.js';
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

/**
 * Busca archivos por patrón (glob-like)
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} pattern - Patrón de búsqueda
 * @returns {Promise<string[]>} - Archivos que coinciden
 */
export async function findFiles(rootPath, pattern) {
  const metadata = await getProjectMetadata(rootPath);
  const files = Object.keys(metadata.fileIndex || {});

  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '@@DOUBLE_STAR@@')
    .replace(/\*/g, '[^/]*')
    .replace(/@@DOUBLE_STAR@@/g, '.*')
    .replace(/\//g, '\\/');

  const regex = new RegExp('^' + regexPattern + '$');
  return files.filter(f => regex.test(f));
}

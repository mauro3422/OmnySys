/**
 * @fileoverview project-query.js
 * 
 * Consultas a nivel de proyecto
 * USA SQLite exclusivamente -sin fallback JSON
 * 
 * @module query/queries/project-query
 */

import path from 'path';
import { getDataDirectory } from '#layer-c/storage/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

/**
 * Obtiene metadata global del proyecto
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<object>} - Metadata + file index
 * @throws {Error} Si SQLite no está disponible
 */
export async function getProjectMetadata(rootPath) {
  const repo = getRepository(rootPath);
  
  if (!repo || !repo.db) {
    throw new Error('SQLite not available. Run analysis first.');
  }
  
  // Get metadata from SQLite
  const metadataRows = repo.db.prepare('SELECT key, value FROM system_metadata').all();
  
  if (!metadataRows || metadataRows.length === 0) {
    throw new Error('No metadata found. Run analysis first.');
  }
  
  const metadata = {};
  for (const row of metadataRows) {
    try {
      metadata[row.key] = JSON.parse(row.value);
    } catch {
      metadata[row.key] = row.value;
    }
  }
  
  // Get files count from atoms table (source of truth)
  const atomsCount = repo.db.prepare('SELECT COUNT(*) as count FROM atoms').get();
  const filesCount = repo.db.prepare('SELECT COUNT(DISTINCT file_path) as count FROM atoms').get();
  
  // Get stats from system_map_metadata if available
  const systemMapMeta = metadata.system_map_metadata || {};
  metadata.stats = {
    totalAtoms: atomsCount?.count || systemMapMeta.totalFunctions || 0,
    totalFiles: filesCount?.count || systemMapMeta.totalFiles || 0
  };
  
  // Use system_map_metadata totals as fallback
  if (!metadata.totalFiles && systemMapMeta.totalFiles) {
    metadata.totalFiles = systemMapMeta.totalFiles;
  }
  if (!metadata.totalFunctions && systemMapMeta.totalFunctions) {
    metadata.totalFunctions = systemMapMeta.totalFunctions;
  }
  
  // Get files list from atoms table
  const files = repo.db.prepare('SELECT DISTINCT file_path FROM atoms LIMIT 1000').all();
  metadata.files = files.map(f => f.file_path);
  metadata.fileIndex = {};
  for (const f of files) {
    metadata.fileIndex[f.file_path] = { path: f.file_path };
  }
  
  return metadata;
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

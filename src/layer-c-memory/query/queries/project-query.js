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

  // Get files + counts from atoms table in ONE query (was 3 separate queries before)
  const files = repo.db.prepare('SELECT DISTINCT file_path FROM atoms').all();
  const totalAtoms = repo.db.prepare('SELECT COUNT(*) as count FROM atoms').get()?.count || 0;

  const systemMapMeta = metadata.system_map_metadata || {};
  metadata.stats = {
    totalAtoms: totalAtoms || systemMapMeta.totalFunctions || 0,
    totalFiles: files.length || systemMapMeta.totalFiles || 0
  };

  metadata.files = files.map(f => f.file_path);
  metadata.fileIndex = {};
  for (const f of files) {
    metadata.fileIndex[f.file_path] = { path: f.file_path };
  }

  // Derive modules by grouping files under their top-level directory
  // (fixes aggregate_metrics 'modules' returning [])
  const moduleMap = {};
  for (const f of files) {
    const parts = f.file_path.split('/');
    const moduleName = parts.length > 1 ? parts[0] : '_root';
    if (!moduleMap[moduleName]) {
      moduleMap[moduleName] = { name: moduleName, files: [], fileCount: 0 };
    }
    moduleMap[moduleName].files.push(f.file_path);
    moduleMap[moduleName].fileCount++;
  }
  metadata.modules = Object.values(moduleMap);
  metadata.totalFiles = files.length;

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

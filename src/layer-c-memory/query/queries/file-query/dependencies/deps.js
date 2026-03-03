/**
 * @fileoverview File dependency queries (imports and dependents)
 * @module query/queries/file-query/dependencies/deps
 */

import { getFileAnalysis } from '../core/single-file.js';
import { getRepository } from '#layer-c/storage/repository/index.js';

/**
 * Obtiene dependencias de un archivo
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string[]>}
 */
export async function getFileDependencies(rootPath, filePath) {
  try {
    const repo = getRepository(rootPath);
    if (repo && repo.db) {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const deps = repo.db.prepare(`
        SELECT DISTINCT target_path FROM file_dependencies
        WHERE source_path = ?
      `).all(normalizedPath);

      if (deps && deps.length > 0) {
        return deps.map(d => d.target_path);
      }
    }
  } catch (err) {
    console.error(`[getFileDependencies] SQLite error: ${err.message}`);
  }

  // Fallback (atoms imports list without resolution)
  const analysis = await getFileAnalysis(rootPath, filePath);
  return analysis?.imports?.map(imp => imp.source) || [];
}

/**
 * Obtiene dependientes de un archivo (archivos que importan este archivo)
 * @param {string} rootPath - Raíz del proyecto
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<string[]>}
 */
export async function getFileDependents(rootPath, filePath) {
  // PRIORIDAD 1: SQLite - query file_dependencies table
  try {
    const repo = getRepository(rootPath);
    if (repo && repo.db) {
      // Query the file_dependencies table for files that depend on this file
      const normalizedPath = filePath.replace(/\\/g, '/');
      const deps = repo.db.prepare(`
        SELECT DISTINCT source_path FROM file_dependencies 
        WHERE target_path = ? OR target_path LIKE ?
      `).all(normalizedPath, normalizedPath.replace(/\.js$/, '') + '%');

      if (deps && deps.length > 0) {
        return deps.map(d => d.source_path);
      }
    }
  } catch (err) {
    console.error(`[getFileDependents] SQLite error: ${err.message}`);
  }

  // Fallback: analysis.usedBy (puede estar vacío si no se populó)
  const analysis = await getFileAnalysis(rootPath, filePath);
  return analysis?.usedBy || [];
}

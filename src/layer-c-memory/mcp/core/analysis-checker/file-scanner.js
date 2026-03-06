/**
 * File scanning utilities for analysis checking
 * @module mcp/core/analysis-checker/file-scanner
 */

import path from 'path';
import fs from 'fs/promises';
import {
  discoverProjectSourceFiles,
  getPersistedKnownFilePaths,
  hasPersistedCompilerAnalysis
} from '../../../../shared/compiler/index.js';

/**
 * Verifica si existe analisis previo en .omnysysdata/
 * @param {string} projectPath - Project root path
 * @returns {Promise<boolean>} - True if analysis exists
 */
export async function hasExistingAnalysis(projectPath) {
  return hasPersistedCompilerAnalysis(projectPath);
}

/**
 * Escanear archivos actuales del proyecto
 * @param {string} projectPath - Project root path
 * @returns {Promise<Array>} - Array of file info objects
 */
export async function scanCurrentFiles(projectPath) {
  try {
    const relativePaths = await discoverProjectSourceFiles(projectPath);
    return await Promise.all(relativePaths.map(async (relativePath) => {
      const fullPath = path.join(projectPath, relativePath);
      const stats = await fs.stat(fullPath);
      return {
        path: relativePath,
        fullPath,
        mtime: stats.mtime.getTime(),
        size: stats.size
      };
    }));
  } catch (error) {
    throw new Error(`scanCurrentFiles failed: ${error.message}`);
  }
}

/**
 * Obtiene los archivos que realmente existen en el índice persistido.
 * Se usan ambas tablas porque `files` puede quedar desfasada durante reinicios,
 * mientras `atoms` refleja mejor qué terminó persistido.
 *
 * @param {string} projectPath - Project root path
 * @returns {Promise<Set<string>>}
 */
export async function getIndexedFilePaths(projectPath) {
  return getPersistedKnownFilePaths(projectPath);
}

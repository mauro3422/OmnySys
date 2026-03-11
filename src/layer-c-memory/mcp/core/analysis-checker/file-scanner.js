/**
 * File scanning utilities for analysis checking
 * @module mcp/core/analysis-checker/file-scanner
 */

import path from 'path';
import fs from 'fs/promises';
import {
  discoverProjectSourceFiles,
  hasPersistedCompilerAnalysis
} from '../../../../shared/compiler/index.js';

export { hasPersistedCompilerAnalysis as hasExistingAnalysis };

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

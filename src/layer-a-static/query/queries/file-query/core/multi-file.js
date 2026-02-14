/**
 * @fileoverview Multi-file batch analysis queries
 * @module query/queries/file-query/core/multi-file
 */

import { getFileAnalysis } from './single-file.js';

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

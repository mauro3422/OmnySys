/**
 * @fileoverview Search Tools
 * 
 * Herramientas para búsqueda de archivos
 * 
 * @module unified-server/tools/search-tools
 */

import { findFiles } from '../../../layer-c-memory/query/apis/project-api.js';

/**
 * Busca archivos por patrón
 * @param {string} pattern - Patrón de búsqueda
 * @returns {Promise<Object>} - Resultados de búsqueda
 */
export async function searchFiles(pattern) {
  try {
    const results = await findFiles(this.projectPath, pattern);
    return { pattern, found: results.length, files: results.slice(0, 20) };
  } catch (error) {
    return { error: error.message };
  }
}

import { analyzeUnusedImports } from './unused-imports/helpers.js';

/**
 * Unused Imports Analyzer
 *
 * Responsabilidad:
 * - Encontrar imports que se hacen pero no se usan en ese archivo
 * - Soportar namespace imports (import * as X)
 * - Soportar default imports
 *
 * @param {object} systemMap - SystemMap generado por graph-builder
 * @returns {object} - Reporte de imports sin usar
 */
export function findUnusedImports(systemMap) {
  if (!systemMap || !systemMap.files) {
    return { total: 0, byFile: {} };
  }

  return analyzeUnusedImports(systemMap);
}

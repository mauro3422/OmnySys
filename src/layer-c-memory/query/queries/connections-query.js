/**
 * @fileoverview connections-query.js
 *
 * Consultas de conexiones semánticas
 * USA SQLite exclusivamente -sin fallback JSON
 *
 * @module query/queries/connections-query
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { getSemanticSurfaceGranularity } from '#shared/compiler/index.js';

/**
 * Obtiene todas las conexiones del proyecto
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<{sharedState: array, eventListeners: array, total: number}>}
 * @throws {Error} Si SQLite no está disponible
 */
export async function getAllConnections(rootPath) {
  const repo = getRepository(rootPath);
  
  if (!repo || !repo.db) {
    throw new Error('SQLite not available. Run analysis first.');
  }
  
  const semanticSurface = getSemanticSurfaceGranularity(repo.db);

  if (semanticSurface.legacyView.total === 0) {
    return {
      sharedState: [],
      eventListeners: [],
      total: 0,
      granularity: semanticSurface.contract
    };
  }

  return {
    sharedState: semanticSurface.legacyView.sharedState,
    eventListeners: semanticSurface.legacyView.eventListeners,
    total: semanticSurface.legacyView.total,
    granularity: semanticSurface.contract,
    semanticByType: semanticSurface.fileLevel.byType
  };
}

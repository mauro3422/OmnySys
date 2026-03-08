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
  const canonicalView = semanticSurface.canonicalAdapterView || semanticSurface.legacyView;

  if (canonicalView.total === 0) {
    return {
      sharedState: [],
      eventListeners: [],
      total: 0,
      granularity: semanticSurface.contract,
      semanticByType: semanticSurface.fileLevel.byType,
      advisorySummary: semanticSurface.persistedLegacyView || { sharedState: [], eventListeners: [], total: 0 },
      derivedFrom: 'atom_relations'
    };
  }

  return {
    sharedState: canonicalView.sharedState,
    eventListeners: canonicalView.eventListeners,
    total: canonicalView.total,
    granularity: semanticSurface.contract,
    semanticByType: semanticSurface.fileLevel.byType,
    advisorySummary: semanticSurface.persistedLegacyView,
    derivedFrom: 'atom_relations'
  };
}

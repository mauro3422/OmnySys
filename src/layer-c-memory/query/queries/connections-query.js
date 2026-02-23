/**
 * @fileoverview connections-query.js
 *
 * Consultas de conexiones semánticas
 * USA SQLite exclusivamente -sin fallback JSON
 *
 * @module query/queries/connections-query
 */

import { getRepository } from '#layer-c/storage/repository/index.js';

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
  
  const connections = repo.db.prepare(`
    SELECT connection_type, source_path, target_path, connection_key, context_json, weight
    FROM semantic_connections
  `).all();
  
  if (!connections || connections.length === 0) {
    return {
      sharedState: [],
      eventListeners: [],
      total: 0
    };
  }
  
  const sharedState = [];
  const eventListeners = [];
  
  for (const conn of connections) {
    const connData = {
      source: conn.source_path,
      target: conn.target_path,
      type: conn.connection_type,
      key: conn.connection_key,
      weight: conn.weight,
      context: JSON.parse(conn.context_json || '{}')
    };
    
    if (conn.connection_type === 'sharedState') {
      sharedState.push(connData);
    } else if (conn.connection_type === 'eventListeners') {
      eventListeners.push(connData);
    }
  }
  
  return {
    sharedState,
    eventListeners,
    total: connections.length
  };
}

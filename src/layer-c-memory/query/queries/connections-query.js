/**
 * @fileoverview connections-query.js
 *
 * Consultas de conexiones semánticas
 * MIGRADO: Ahora usa SQLite en lugar de archivos JSON
 *
 * @module query/queries/connections-query
 */

import path from 'path';
import { getDataDirectory } from '#layer-c/storage/index.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { readJSON, fileExists } from '../readers/json-reader.js';

/**
 * Obtiene todas las conexiones del proyecto
 * MIGRADO: Consulta SQLite primero, fallback a JSON legacy
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<{sharedState: array, eventListeners: array, total: number}>}
 */
export async function getAllConnections(rootPath) {
  // PRIORIDAD 1: SQLite - semantic_connections table
  try {
    const repo = getRepository(rootPath);
    if (repo && repo.db) {
      const connections = repo.db.prepare(`
        SELECT connection_type, source_path, target_path, connection_key, context_json, weight
        FROM semantic_connections
      `).all();
      
      if (connections && connections.length > 0) {
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
    }
  } catch (err) {
    console.error(`[getAllConnections] SQLite error: ${err.message}`);
  }
  
  // Fallback: JSON legacy
  const dataPath = getDataDirectory(rootPath);
  const connectionsDir = path.join(dataPath, 'connections');

  const sharedStatePath = path.join(connectionsDir, 'shared-state.json');
  const eventListenersPath = path.join(connectionsDir, 'event-listeners.json');

  let sharedState = { connections: [], total: 0 };
  let eventListeners = { connections: [], total: 0 };

  if (await fileExists(sharedStatePath)) {
    sharedState = await readJSON(sharedStatePath);
  }

  if (await fileExists(eventListenersPath)) {
    eventListeners = await readJSON(eventListenersPath);
  }

  const sharedStateConnections = sharedState.connections || [];
  const eventListenersConnections = eventListeners.connections || [];
  const sharedStateTotal = sharedState.total !== undefined ? sharedState.total : sharedStateConnections.length;
  const eventListenersTotal = eventListeners.total !== undefined ? eventListeners.total : eventListenersConnections.length;

  return {
    sharedState: sharedStateConnections,
    eventListeners: eventListenersConnections,
    total: sharedStateTotal + eventListenersTotal
  };
}

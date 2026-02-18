/**
 * @fileoverview connections-query.js
 *
 * Consultas de conexiones semánticas
 *
 * @module query/queries/connections-query
 */

import path from 'path';
import { getDataDirectory } from '#layer-c/storage/index.js';
import { readJSON, fileExists } from '../readers/json-reader.js';

/**
 * Obtiene todas las conexiones del proyecto
 * @param {string} rootPath - Raíz del proyecto
 * @returns {Promise<{sharedState: array, eventListeners: array, total: number}>}
 */
export async function getAllConnections(rootPath) {
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

  // Calculate total from connections arrays if totals are missing
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

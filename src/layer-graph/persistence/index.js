/**
 * Persistence Index - Layer Graph
 * 
 * Note: Core persistence is now handled by Layer C (SQLite).
 * This module provides utilities and placeholders for graph serialization
 * and delta calculation, but the primary storage source is the SQLite DB.
 */

/**
 * Serializa el grafo a formato JSON (Legacy/Debug)
 * @param {Object} systemMap - El grafo del sistema
 * @returns {string} JSON stringificado
 */
export function serializeGraph(systemMap) {
  if (!systemMap) return null;
  return JSON.stringify(systemMap, null, 2);
}

/**
 * Deserializa un grafo desde JSON (Legacy/Debug)
 * @param {string} jsonStr - JSON del grafo
 * @returns {Object} SystemMap restaurado
 */
export function deserializeGraph(jsonStr) {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    return null;
  }
}

/**
 * Calcula el delta (diferencia) entre dos versiones del grafo
 */
export function getGraphDelta(oldGraph, newGraph) {
  const delta = {
    added: { files: [], dependencies: [], functions: [] },
    removed: { files: [], dependencies: [], functions: [] },
    modified: { files: [], dependencies: [], functions: [] }
  };

  if (!oldGraph || !newGraph) return delta;

  const oldFiles = new Set(Object.keys(oldGraph.files || {}));
  const newFiles = new Set(Object.keys(newGraph.files || {}));

  for (const file of newFiles) {
    if (!oldFiles.has(file)) delta.added.files.push(file);
  }

  for (const file of oldFiles) {
    if (!newFiles.has(file)) delta.removed.files.push(file);
  }

  return delta;
}

/**
 * Aplica un delta a un grafo existente
 */
export function applyGraphDelta(graph, delta) {
  if (!graph || !delta) return graph;
  const result = JSON.parse(JSON.stringify(graph));
  for (const file of delta.removed.files) {
    delete result.files[file];
  }
  return result;
}

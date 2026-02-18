/**
 * @fileoverview Persistence - Persistencia del grafo
 * 
 * @module layer-graph/persistence
 * @version 1.0.0
 * @status placeholder
 * 
 * Funcionalidades planeadas:
 * - serializeGraph: Convertir grafo a JSON
 * - deserializeGraph: Restaurar grafo desde JSON
 * - getGraphDelta: Calcular diferencias entre versiones
 * - applyGraphDelta: Aplicar cambios incrementales
 */

/**
 * Serializa el grafo a formato JSON
 * @param {Object} systemMap - El grafo del sistema
 * @returns {string} JSON stringificado
 */
export function serializeGraph(systemMap) {
  if (!systemMap) return null;
  return JSON.stringify(systemMap, null, 2);
}

/**
 * Deserializa un grafo desde JSON
 * @param {string} jsonStr - JSON del grafo
 * @returns {Object} SystemMap restaurado
 */
export function deserializeGraph(jsonStr) {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Error deserializing graph:', error.message);
    return null;
  }
}

/**
 * Calcula el delta (diferencia) entre dos versiones del grafo
 * @param {Object} oldGraph - Grafo anterior
 * @param {Object} newGraph - Grafo nuevo
 * @returns {Object} Delta con cambios
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
    if (!oldFiles.has(file)) {
      delta.added.files.push(file);
    }
  }

  for (const file of oldFiles) {
    if (!newFiles.has(file)) {
      delta.removed.files.push(file);
    }
  }

  return delta;
}

/**
 * Aplica un delta a un grafo existente
 * @param {Object} graph - Grafo base
 * @param {Object} delta - Delta de cambios
 * @returns {Object} Grafo modificado
 */
export function applyGraphDelta(graph, delta) {
  if (!graph || !delta) return graph;

  const result = JSON.parse(JSON.stringify(graph));

  for (const file of delta.removed.files) {
    delete result.files[file];
  }

  for (const file of delta.added.files) {
    if (delta.added.fileData && delta.added.fileData[file]) {
      result.files[file] = delta.added.fileData[file];
    }
  }

  return result;
}

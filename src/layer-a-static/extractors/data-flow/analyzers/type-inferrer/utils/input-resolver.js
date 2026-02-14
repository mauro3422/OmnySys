/**
 * @fileoverview Input Type Resolver
 * 
 * Resuelve tipos de inputs para nodos.
 * 
 * @module data-flow-v2/analyzers/type-inferrer/utils/input-resolver
 */

/**
 * Resuelve el tipo de un input
 * @param {Object} input - Input a resolver
 * @param {Map} typeMap - Mapa de tipos
 * @param {Object} graph - Grafo
 * @returns {string} Tipo resuelto
 */
export function resolveInputType(input, typeMap, graph) {
  if (!input) return 'unknown';

  if (input.type === 'literal') {
    return typeof input.value;
  }

  if (input.type === 'variable' && input.name) {
    // Buscar en nodos anteriores que produzcan esta variable
    const producerNode = findProducerNode(input.name, graph);
    if (producerNode) {
      return typeMap.get(producerNode.id) || 'unknown';
    }
    
    // Si es parámetro, mirar el tipo declarado (si hay)
    if (input.isParam) {
      return 'any'; // Parámetros son any hasta que se use
    }
  }

  return input.type || 'unknown';
}

/**
 * Encuentra el nodo que produce una variable
 * @param {string} varName - Nombre de la variable
 * @param {Object} graph - Grafo
 * @returns {Object|null} Nodo productor
 */
export function findProducerNode(varName, graph) {
  return graph.nodes.find(node => 
    node.output?.name === varName
  );
}

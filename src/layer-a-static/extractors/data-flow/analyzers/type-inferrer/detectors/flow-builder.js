/**
 * @fileoverview Type Flow Builder
 * 
 * Construye el flujo de tipos completo.
 * 
 * @module data-flow-v2/analyzers/type-inferrer/detectors/flow-builder
 */

/**
 * Construye el flujo de tipos completo
 * @param {Map} typeMap - Mapa de tipos
 * @param {Object} graph - Grafo
 * @returns {Object} Flujo de tipos
 */
export function buildTypeFlow(typeMap, graph) {
  const typeFlow = {
    nodes: [],
    variables: new Map(),
    summary: {
      totalNodes: graph.nodes.length,
      typedNodes: 0,
      unknownNodes: 0,
      typeMismatches: []
    }
  };

  for (const [nodeId, type] of typeMap) {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) continue;

    const typeInfo = {
      nodeId,
      type,
      variable: node.output?.name,
      operation: node.type,
      location: node.location
    };

    typeFlow.nodes.push(typeInfo);

    if (node.output?.name) {
      typeFlow.variables.set(node.output.name, type);
    }

    // Contar estadísticas
    if (type === 'unknown' || (typeof type === 'object' && type.warning)) {
      typeFlow.summary.unknownNodes++;
    } else {
      typeFlow.summary.typedNodes++;
    }

    if (typeof type === 'object' && type.warning === 'TYPE_MISMATCH') {
      typeFlow.summary.typeMismatches.push(typeInfo);
    }
  }

  // Convertir Map a objeto para JSON
  typeFlow.variables = Object.fromEntries(typeFlow.variables);

  return typeFlow;
}

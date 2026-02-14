/**
 * @fileoverview Metrics calculator - Calcula métricas del grafo
 * @module graph-builder/metrics/calculator
 */

/**
 * Calcula métricas del grafo incluyendo centralidad
 * @param {Array} nodes - Nodos del grafo
 * @param {Array} edges - Aristas del grafo
 * @returns {Object} Métricas calculadas
 */
export function calculateMetrics(nodes, edges) {
  const centrality = calculateCentrality(nodes, edges);
  
  const sortedByCentrality = [...centrality.entries()]
    .sort((a, b) => b[1] - a[1]);
  
  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    avgConnectivity: edges.length / (nodes.length || 1),
    mostCentralNodes: sortedByCentrality.slice(0, 5).map(([id, score]) => {
      const node = nodes.find(n => n.id === id);
      return { function: node?.function, score };
    }),
    isolatedNodes: nodes.filter(n => centrality.get(n.id) === 0).length
  };
}

/**
 * Calcula centralidad de nodos (conectividad)
 * @param {Array} nodes - Nodos del grafo
 * @param {Array} edges - Aristas del grafo
 * @returns {Map} Mapa de centralidad por nodo
 */
export function calculateCentrality(nodes, edges) {
  const centrality = new Map();
  
  for (const node of nodes) {
    const incoming = edges.filter(e => e.to === node.id).length;
    const outgoing = edges.filter(e => e.from === node.id).length;
    centrality.set(node.id, incoming + outgoing);
  }
  
  return centrality;
}

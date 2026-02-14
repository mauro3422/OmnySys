/**
 * @fileoverview Graph Builder Public API
 * 
 * Construye grafo de flujo entre funciones donde:
 * - Nodos = Funciones (átomos)
 * - Aristas = Flujo de datos entre funciones
 * 
 * @module graph-builder
 */

export { GraphBuilder } from './GraphBuilder.js';

// Nodes
export { buildNodes, determineNodeType, determinePositionInChains } from './nodes/index.js';

// Edges
export { buildEdges, determineEdgeType, buildReturnEdges, findReturnUsage } from './edges/index.js';

// Paths
export { findPaths } from './paths/index.js';

// Metrics
export { calculateMetrics, calculateCentrality } from './metrics/index.js';

/**
 * @fileoverview Edges module - Exporta funciones de construcción de aristas
 * @module graph-builder/edges
 */

export { assembleEdges as buildEdges, determineEdgeType } from './builder.js';
export { assembleReturnEdges as buildReturnEdges, findReturnUsage } from './return-flow.js';

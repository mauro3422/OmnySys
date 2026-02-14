/**
 * @fileoverview Union Type Inferrer
 * 
 * Infiere tipos unión para ternarios y otras operaciones.
 * 
 * @module data-flow-v2/analyzers/type-inferrer/inferrers/union-inferrer
 */

import { resolveInputType } from '../utils/input-resolver.js';
import { simplifyUnion } from '../utils/type-utils.js';

/**
 * Infiere tipo unión para ternarios
 * @param {Object} node - Nodo ternario
 * @param {Map} typeMap - Mapa de tipos
 * @param {Object} graph - Grafo
 * @returns {string|Object} Tipo unión
 */
export function inferUnionType(node, typeMap, graph) {
  const inputs = node.inputs || [];
  if (inputs.length < 3) return 'unknown';

  const trueType = resolveInputType(inputs[1], typeMap, graph);
  const falseType = resolveInputType(inputs[2], typeMap, graph);

  if (trueType === falseType) {
    return trueType;
  }

  return {
    type: 'union',
    types: [trueType, falseType],
    simplified: simplifyUnion([trueType, falseType])
  };
}

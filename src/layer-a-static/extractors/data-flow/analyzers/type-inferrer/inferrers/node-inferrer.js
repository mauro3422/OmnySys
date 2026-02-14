/**
 * @fileoverview Node Type Inferrer
 * 
 * Infiere tipos para nodos individuales.
 * 
 * @module data-flow-v2/analyzers/type-inferrer/inferrers/node-inferrer
 */

import { inferHeuristicType } from './heuristic-inferrer.js';
import { resolveInputType, findProducerNode } from '../utils/input-resolver.js';
import { inferUnionType } from './union-inferrer.js';

/**
 * Infiere tipo de un nodo específico
 * @param {Object} node - Nodo a analizar
 * @param {Object} typeRules - Reglas de tipos
 * @param {Map} typeMap - Mapa de tipos actual
 * @param {Object} graph - Grafo completo
 * @returns {string|Object} Tipo inferido
 */
export function inferNodeType(node, typeRules, typeMap, graph) {
  const rule = typeRules[node.type];
  
  if (!rule) {
    // Sin regla específica, intentar heurísticas
    return inferHeuristicType(node);
  }

  // Verificar compatibilidad de inputs
  const inputTypes = (node.inputs || []).map(input => 
    resolveInputType(input, typeMap, graph)
  );

  // Si hay tipos incompatibles, marcar error potencial
  if (hasTypeMismatch(inputTypes, rule.in)) {
    return {
      type: rule.out,
      warning: 'TYPE_MISMATCH',
      expected: rule.in,
      actual: inputTypes
    };
  }

  // Inferir tipo de salida
  if (rule.out === 'union' && node.type === 'TERNARY') {
    // Para ternarios, unión de tipos de ramas
    return inferUnionType(node, typeMap, graph);
  }

  if (rule.out === 'any' && node.type === 'PROPERTY_ACCESS') {
    // Para property access, no podemos saber sin análisis adicional
    return 'any';
  }

  return rule.out;
}

/**
 * Verifica si hay mismatch de tipos
 * @param {Array} actualTypes - Tipos actuales
 * @param {Array} expectedTypes - Tipos esperados
 * @returns {boolean}
 */
function hasTypeMismatch(actualTypes, expectedTypes) {
  // Simplificación - en producción sería más sofisticado
  return false;
}

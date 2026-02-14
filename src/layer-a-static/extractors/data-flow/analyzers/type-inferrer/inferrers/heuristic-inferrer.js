/**
 * @fileoverview Heuristic Type Inferrer
 * 
 * Infiere tipos usando heurísticas cuando no hay reglas específicas.
 * 
 * @module data-flow-v2/analyzers/type-inferrer/inferrers/heuristic-inferrer
 */

/**
 * Infiere tipo usando heurísticas cuando no hay regla específica
 * @param {Object} node - Nodo a analizar
 * @returns {string} Tipo inferido
 */
export function inferHeuristicType(node) {
  // Basado en el nombre de la función llamada
  if (node.properties?.functionName) {
    return inferTypeFromFunctionName(node.properties.functionName);
  }

  // Basado en el contexto
  if (node.category === 'side_effect') {
    if (node.properties?.async) return 'promise';
    return 'void';
  }

  // Default
  return 'unknown';
}

/**
 * Infiere tipo desde nombre de función
 * @param {string} name - Nombre de la función
 * @returns {string} Tipo inferido
 */
function inferTypeFromFunctionName(name) {
  const lower = name.toLowerCase();
  
  if (/calculate|compute|sum|count|total|avg|mean/.test(lower)) {
    return 'number';
  }
  
  if (/find|get|load|fetch|read/.test(lower)) {
    return 'any'; // Podría ser cualquier cosa
  }
  
  if (/validate|check|is|has|can|should/.test(lower)) {
    return 'boolean';
  }
  
  if (/format|stringify|toString|join/.test(lower)) {
    return 'string';
  }
  
  if (/parse|deserialize/.test(lower)) {
    return 'object'; // Asumimos objeto parseado
  }
  
  return 'unknown';
}

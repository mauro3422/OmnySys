/**
 * @fileoverview Archetype Recommendations - Recomendaciones por arquetipo
 * 
 * @module atomic/recommendations
 */

/**
 * Obtiene recomendación basada en el arquetipo
 * @param {string} archetypeType - Tipo de arquetipo
 * @returns {string} Recomendación
 */
export function getRecommendation(archetypeType) {
  const recommendations = {
    'fragile-network': 'Add try/catch blocks before modifying network logic',
    'hot-path': 'Changes will affect multiple callers - test thoroughly',
    'dead-function': 'Function is safe to remove or refactor',
    'god-function': 'Consider breaking into smaller functions',
    'default': 'Standard changes - proceed with normal testing'
  };
  return recommendations[archetypeType] || recommendations.default;
}

/**
 * Obtiene todas las recomendaciones para un átomo
 * @param {Object} atom - Datos del átomo
 * @returns {Array<string>} Lista de recomendaciones
 */
export function getAllRecommendations(atom) {
  const recommendations = [];
  
  // Recomendación por arquetipo
  const archetypeRec = getRecommendation(atom.archetype?.type);
  if (archetypeRec) {
    recommendations.push(archetypeRec);
  }
  
  // Recomendaciones adicionales basadas en métricas
  if (atom.complexity > 10) {
    recommendations.push('High complexity - consider refactoring');
  }
  
  if (atom.hasNestedLoops) {
    recommendations.push('Contains nested loops - check performance impact');
  }
  
  if (!atom.hasErrorHandling && atom.hasNetworkCalls) {
    recommendations.push('Network calls without error handling - add try/catch');
  }
  
  return recommendations;
}

/**
 * Genera recomendaciones de testing
 * @param {Object} atom - Datos del átomo
 * @returns {Array<string>} Recomendaciones de testing
 */
export function getTestingRecommendations(atom) {
  const recs = [];
  
  if (atom.isExported && atom.calledBy?.length === 0) {
    recs.push('Exported but unused - verify if needed or add tests');
  }
  
  if (atom.hasNetworkCalls) {
    recs.push('Mock network calls in unit tests');
  }
  
  if (atom.hasAsync) {
    recs.push('Test async behavior and error handling');
  }
  
  return recs;
}

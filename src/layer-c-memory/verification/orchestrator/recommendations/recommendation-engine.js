/**
 * @fileoverview Recommendation Engine - Generación de recomendaciones
 * 
 * Responsabilidad Única (SRP): Generar recomendaciones basadas en issues encontrados.
 * 
 * @module verification/orchestrator/recommendations
 */

/**
 * Recomendación generada
 * @typedef {Object} Recommendation
 * @property {string} priority - Prioridad (high, medium, low)
 * @property {string} action - Acción recomendada
 * @property {string} reason - Razón de la recomendación
 */

/**
 * Genera recomendaciones basadas en issues encontrados
 * 
 * @param {Array} allIssues - Todos los issues encontrados
 * @returns {Array<Recommendation>} Lista de recomendaciones
 */
export function generateRecommendations(allIssues) {
  const recommendations = [];
  
  // Detectar patrones de issues
  const hasPathIssues = allIssues.some(i => 
    i.category === 'structure' && i.message.includes('path')
  );
  
  const hasMissingAtoms = allIssues.some(i =>
    i.message.includes('no atoms')
  );
  
  const hasOrphanedAtoms = allIssues.some(i =>
    i.message.includes('non-existent file')
  );
  
  if (hasPathIssues) {
    recommendations.push({
      priority: 'high',
      action: 'Normalize all paths to relative format with forward slashes',
      reason: 'Path inconsistencies break cross-referencing between systems'
    });
  }
  
  if (hasMissingAtoms) {
    recommendations.push({
      priority: 'high',
      action: 'Run atomic extraction for all files',
      reason: 'Missing atoms mean incomplete analysis'
    });
  }
  
  if (hasOrphanedAtoms) {
    recommendations.push({
      priority: 'medium',
      action: 'Clean up orphaned atoms or re-analyze missing files',
      reason: 'Orphaned atoms indicate stale data'
    });
  }
  
  if (allIssues.length === 0) {
    recommendations.push({
      priority: 'low',
      action: 'Schedule regular verification runs',
      reason: 'Prevent future inconsistencies'
    });
  }
  
  return recommendations;
}

/**
 * Prioriza recomendaciones por severidad
 * @param {Array<Recommendation>} recommendations 
 * @returns {Array<Recommendation>} Recomendaciones ordenadas
 */
export function prioritizeRecommendations(recommendations) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  
  return [...recommendations].sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

/**
 * Filtra recomendaciones por prioridad
 * @param {Array<Recommendation>} recommendations 
 * @param {string} minPriority - Prioridad mínima (high, medium, low)
 * @returns {Array<Recommendation>} Recomendaciones filtradas
 */
export function filterRecommendationsByPriority(recommendations, minPriority) {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  const minLevel = priorityOrder[minPriority] || 1;
  
  return recommendations.filter(r => 
    priorityOrder[r.priority] >= minLevel
  );
}

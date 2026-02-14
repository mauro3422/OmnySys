/**
 * @fileoverview Issue Filters
 * 
 * Filtrado y consulta de issues.
 * 
 * @module consistency/issue-manager/managers/issue-filters
 */

/**
 * Filtra issues por severidad
 * @param {Array} issues - Lista de issues
 * @param {string} severity - Severidad a filtrar
 * @returns {Array} - Issues filtrados
 */
export function getIssuesBySeverity(issues, severity) {
  return issues.filter(i => i.severity === severity);
}

/**
 * Filtra issues por categoría
 * @param {Array} issues - Lista de issues
 * @param {string} category - Categoría a filtrar
 * @returns {Array} - Issues filtrados
 */
export function getIssuesByCategory(issues, category) {
  return issues.filter(i => i.category === category);
}

/**
 * Verifica si hay issues críticos
 * @param {Array} issues - Lista de issues
 * @param {Object} Severity - Constantes de severidad
 * @returns {boolean} - True si hay issues críticos
 */
export function hasCriticalIssues(issues, Severity) {
  return issues.some(i => i.severity === Severity.CRITICAL);
}

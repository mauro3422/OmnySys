/**
 * @fileoverview Issue Counters
 * 
 * Utilidades para conteo de issues.
 * 
 * @module consistency/issue-manager/utils/counters
 */

/**
 * Cuenta issues por severidad
 * @param {Array} issues - Lista de issues
 * @returns {Object} - Conteo por severidad
 */
export function countBySeverity(issues) {
  const counts = {};
  for (const issue of issues) {
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
  }
  return counts;
}

/**
 * Cuenta issues por sistema
 * @param {Array} issues - Lista de issues
 * @returns {Object} - Conteo por sistema
 */
export function countBySystem(issues) {
  const counts = {};
  for (const issue of issues) {
    counts[issue.system] = (counts[issue.system] || 0) + 1;
  }
  return counts;
}

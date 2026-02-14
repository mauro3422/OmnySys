/**
 * @fileoverview Status Checker - Verificación de estado rápido
 * 
 * Responsabilidad Única (SRP): Proporcionar resumen rápido del estado de verificación.
 * 
 * @module verification/orchestrator/status
 */

import { Severity } from '../../types/index.js';

/**
 * Estado rápido
 * @typedef {Object} QuickStatus
 * @property {string} status - Estado (CRITICAL, WARNING, OK, PERFECT)
 * @property {string} emoji - Emoji representativo
 * @property {number} count - Cantidad de issues
 */

/**
 * Obtiene resumen rápido del estado de verificación
 * 
 * @param {Array} results - Resultados de los validadores
 * @returns {QuickStatus} Estado rápido
 */
export function getQuickStatus(results) {
  const allIssues = results.flatMap(r => r.issues || []);
  const critical = allIssues.filter(i => i.severity === Severity.CRITICAL).length;
  const high = allIssues.filter(i => i.severity === Severity.HIGH).length;
  
  if (critical > 0) return { status: 'CRITICAL', emoji: '🔴', count: critical };
  if (high > 0) return { status: 'WARNING', emoji: '🟡', count: high };
  if (allIssues.length > 0) return { status: 'OK', emoji: '🟢', count: allIssues.length };
  return { status: 'PERFECT', emoji: '✅', count: 0 };
}

/**
 * Determina el estado general basado en issues
 * 
 * @param {Array} issues - Issues encontrados
 * @returns {string} Estado (passed, warning, failed)
 */
export function determineStatus(issues) {
  if (issues.some(i => i.severity === Severity.CRITICAL)) {
    return 'failed';
  }
  if (issues.length > 0) {
    return 'warning';
  }
  return 'passed';
}

/**
 * Cuenta issues por severidad
 * 
 * @param {Array} issues - Issues a contar
 * @returns {Object} Conteo por severidad
 */
export function countBySeverity(issues) {
  return {
    critical: issues.filter(i => i.severity === Severity.CRITICAL).length,
    high: issues.filter(i => i.severity === Severity.HIGH).length,
    medium: issues.filter(i => i.severity === Severity.MEDIUM).length,
    low: issues.filter(i => i.severity === Severity.LOW).length,
    info: issues.filter(i => i.severity === Severity.INFO).length
  };
}

/**
 * Verifica si hay issues críticos
 * @param {Array} issues - Issues a verificar
 * @returns {boolean} true si hay issues críticos
 */
export function hasCriticalIssues(issues) {
  return issues.some(i => i.severity === Severity.CRITICAL);
}

/**
 * Verifica si hay issues de alta severidad
 * @param {Array} issues - Issues a verificar
 * @returns {boolean} true si hay issues de alta severidad
 */
export function hasHighSeverityIssues(issues) {
  return issues.some(i => i.severity === Severity.HIGH);
}

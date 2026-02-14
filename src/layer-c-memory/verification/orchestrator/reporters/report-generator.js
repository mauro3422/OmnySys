/**
 * @fileoverview Report Generator - Generación de reportes de verificación
 * 
 * Responsabilidad Única (SRP): Generar reportes consolidados de verificación.
 * 
 * @module verification/orchestrator/reporters
 */

import { VerificationStatus, Severity } from '../../types/index.js';
import { generateRecommendations } from '../recommendations/recommendation-engine.js';

/**
 * Genera reporte consolidado de verificación
 * 
 * @param {Array} results - Resultados de los validadores
 * @param {Array} validators - Validadores ejecutados
 * @param {string} projectPath - Path del proyecto
 * @param {number} startTime - Timestamp de inicio
 * @returns {Object} Reporte consolidado
 */
export function generateReport(results, validators, projectPath, startTime) {
  const allIssues = results.flatMap(r => r.issues || []);
  
  // Determinar estado general
  let status = VerificationStatus.PASSED;
  if (allIssues.some(i => i.severity === Severity.CRITICAL)) {
    status = VerificationStatus.FAILED;
  } else if (allIssues.length > 0) {
    status = VerificationStatus.WARNING;
  }
  
  // Agrupar issues por severidad
  const bySeverity = {
    critical: allIssues.filter(i => i.severity === Severity.CRITICAL).length,
    high: allIssues.filter(i => i.severity === Severity.HIGH).length,
    medium: allIssues.filter(i => i.severity === Severity.MEDIUM).length,
    low: allIssues.filter(i => i.severity === Severity.LOW).length,
    info: allIssues.filter(i => i.severity === Severity.INFO).length
  };
  
  // Agrupar por sistema
  const bySystem = {};
  allIssues.forEach(issue => {
    bySystem[issue.system] = (bySystem[issue.system] || 0) + 1;
  });
  
  // Generar resumen
  const summary = generateSummary(allIssues);
  
  return {
    projectPath,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    status,
    summary,
    stats: {
      totalIssues: allIssues.length,
      bySeverity,
      bySystem,
      validatorsRun: validators.length
    },
    issues: allIssues,
    validatorResults: results.map(r => ({
      status: r.status,
      issueCount: (r.issues || []).length,
      stats: r.stats || {}
    }))
  };
}

/**
 * Genera resumen ejecutivo del reporte
 * 
 * @param {Array} allIssues - Todos los issues encontrados
 * @returns {Object} Resumen con mensaje y recomendaciones
 */
export function generateSummary(allIssues) {
  const criticalCount = allIssues.filter(i => i.severity === Severity.CRITICAL).length;
  const highCount = allIssues.filter(i => i.severity === Severity.HIGH).length;
  
  let message = '';
  if (criticalCount > 0) {
    message = `❌ CRITICAL: ${criticalCount} critical issues found. System integrity compromised.`;
  } else if (highCount > 0) {
    message = `⚠️ WARNING: ${highCount} high severity issues found. SSOT violations detected.`;
  } else if (allIssues.length > 0) {
    message = `ℹ️ INFO: ${allIssues.length} minor issues found. System functional but has inconsistencies.`;
  } else {
    message = `✅ PASSED: All systems verified. Data integrity and consistency confirmed.`;
  }
  
  return {
    message,
    recommendations: generateRecommendations(allIssues)
  };
}

/**
 * Agrupa issues por categoría
 * @param {Array} issues - Issues a agrupar
 * @returns {Object} Issues agrupados por categoría
 */
export function groupIssuesByCategory(issues) {
  const grouped = {};
  
  issues.forEach(issue => {
    const category = issue.category || 'uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(issue);
  });
  
  return grouped;
}

/**
 * Calcula estadísticas de issues
 * @param {Array} issues - Issues a analizar
 * @returns {Object} Estadísticas
 */
export function calculateIssueStats(issues) {
  return {
    total: issues.length,
    bySeverity: {
      critical: issues.filter(i => i.severity === Severity.CRITICAL).length,
      high: issues.filter(i => i.severity === Severity.HIGH).length,
      medium: issues.filter(i => i.severity === Severity.MEDIUM).length,
      low: issues.filter(i => i.severity === Severity.LOW).length,
      info: issues.filter(i => i.severity === Severity.INFO).length
    },
    bySystem: issues.reduce((acc, issue) => {
      acc[issue.system] = (acc[issue.system] || 0) + 1;
      return acc;
    }, {})
  };
}

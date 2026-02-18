/**
 * @fileoverview Risk Assessment Tools
 * 
 * Herramientas para evaluación de riesgos
 * 
 * @module unified-server/tools/risk-tools
 */

import { getRiskAssessment } from '../../../layer-c-memory/query/apis/risk-api.js';

/**
 * Obtiene evaluación de riesgos
 * @param {string} minSeverity - Severidad mínima ('low'|'medium'|'high'|'critical')
 * @returns {Promise<Object>} - Evaluación de riesgos
 */
export async function getRisk(minSeverity = 'medium') {
  try {
    const assessment = this.cache.ramCacheGet('assessment') ||
      await getRiskAssessment(this.projectPath);

    const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const minLevel = severityOrder[minSeverity];

    const filtered = assessment.report.criticalRiskFiles
      ?.concat(assessment.report.highRiskFiles || [], assessment.report.mediumRiskFiles || [])
      .filter((f) => severityOrder[f.severity] >= minLevel)
      .slice(0, 10);

    return {
      summary: assessment.report.summary,
      topRiskFiles: filtered,
      recommendation: assessment.report.summary.criticalCount > 0
        ? '🚨 Critical issues detected - Review high-risk files'
        : '✓ Risk levels acceptable'
    };
  } catch (error) {
    return { error: error.message };
  }
}

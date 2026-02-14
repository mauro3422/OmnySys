/**
 * @fileoverview Issue management utilities
 * @module verification/validators/integrity/utils/issue-manager
 */

import { Severity, DataSystem } from '../../../types/index.js';

/**
 * Gestiona la colección de issues de validación
 */
export class IssueManager {
  constructor() {
    this.issues = [];
  }

  /**
   * Agrega un issue a la lista
   * @param {Object} params - Parámetros del issue
   */
  addIssue({ category, severity, system, path, message, expected, actual, suggestion }) {
    this.issues.push({
      id: `integrity-${Date.now()}-${this.issues.length}`,
      category,
      severity,
      system,
      path,
      message,
      expected,
      actual,
      suggestion,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Obtiene todos los issues
   * @returns {Array} Lista de issues
   */
  getIssues() {
    return this.issues;
  }

  /**
   * Calcula estadísticas de issues por sistema y severidad
   * @returns {Object} Estadísticas
   */
  calculateStats() {
    const stats = {};

    Object.values(DataSystem).forEach(system => {
      const systemIssues = this.issues.filter(i => i.system === system);
      stats[system] = {
        total: systemIssues.length,
        bySeverity: {
          critical: systemIssues.filter(i => i.severity === Severity.CRITICAL).length,
          high: systemIssues.filter(i => i.severity === Severity.HIGH).length,
          medium: systemIssues.filter(i => i.severity === Severity.MEDIUM).length,
          low: systemIssues.filter(i => i.severity === Severity.LOW).length
        }
      };
    });

    return stats;
  }
}

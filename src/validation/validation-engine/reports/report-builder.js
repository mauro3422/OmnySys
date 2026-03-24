/**
 * @fileoverview Report Builder - Constructor de reportes de validación
 * 
 * Separa la lógica de construcción de reportes del engine.
 * SRP: Única responsabilidad es construir y formatear reportes.
 * 
 * @module validation-engine/reports/report-builder
 */

import { ValidationReport, ValidationResult, ValidationSeverity } from '../../core/results/index.js';

/**
 * Builder para construcción paso a paso de reportes
 */
export class ReportBuilder {
  constructor(options = {}) {
    this.options = options;
    this.resetReport();
  }

  /**
   * Reinicia el builder
   * @returns {ReportBuilder}
   */
  resetReport() {
    this.report = new ValidationReport(this.options);
    return this;
  }

  /**
   * Agrega resultados al reporte
   * @param {ValidationResult[]} results
   * @returns {ReportBuilder}
   */
  addResults(results) {
    this.report.addResults(results);
    return this;
  }

  /**
   * Agrega un resultado al reporte
   * @param {ValidationResult} result
   * @returns {ReportBuilder}
   */
  addResult(result) {
    this.report.addResult(result);
    return this;
  }

  /**
   * Marca entidades como stale
   * @param {string[]} entityIds
   * @param {string} reason
   * @returns {ReportBuilder}
   */
  markStale(entityIds, reason) {
    entityIds.forEach(id => this.report.markStale(id, reason));
    return this;
  }

  /**
   * Agrega error de ejecución al reporte
   * @param {Error} error
   * @returns {ReportBuilder}
   */
  addError(error) {
    this.report.addResult(ValidationResult.critical(
      'validation-engine',
      'execution',
      'success',
      `error: ${error.message}`,
      { details: { stack: error.stack } }
    ));
    return this;
  }

  /**
   * Completa el reporte y lo retorna
   * @returns {ValidationReport}
   */
  build() {
    this.report.complete();
    return this.report;
  }

  /**
   * Obtiene estadísticas del reporte actual
   * @returns {Object}
   */
  getReportBuilderStats() {
    return this.report.stats || { passed: 0, failed: 0, critical: 0, total: 0 };
  }

  /**
   * Verifica si hay violaciones críticas
   * @returns {boolean}
   */
  hasCriticalViolations() {
    return this.report.hasCriticalViolations;
  }
}

export default { ReportBuilder };

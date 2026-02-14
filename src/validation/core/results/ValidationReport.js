/**
 * @fileoverview ValidationReport class
 * 
 * @module validation/core/results/ValidationReport
 */

import { ValidationSeverity } from './constants.js';

/** Reporte completo de validación */
export class ValidationReport {
  /**
   * @param {Object} [options={}] - Report options
   */
  constructor(options = {}) {
    this.projectPath = options.projectPath || '';
    this.omnysysPath = options.omnysysPath || '';
    this.startedAt = new Date().toISOString();
    this.completedAt = null;
    this.results = [];
    this.invariantViolations = [];
    this.staleEntities = [];
    this.stats = { total: 0, passed: 0, warnings: 0, failed: 0, critical: 0, fixed: 0 };
    this.layers = {
      source: { results: [], stats: { passed: 0, failed: 0 } },
      derivation: { results: [], stats: { passed: 0, failed: 0 } },
      semantic: { results: [], stats: { passed: 0, failed: 0 } },
      crossMetadata: { results: [], stats: { passed: 0, failed: 0 } }
    };
    this.duration = 0;
  }

  /** @param {ValidationResult} result */
  addResult(result) {
    this.results.push(result);
    this.stats.total++;
    
    if (result.valid) {
      result.severity === ValidationSeverity.WARNING 
        ? this.stats.warnings++ 
        : this.stats.passed++;
    } else if (result.severity === ValidationSeverity.CRITICAL) {
      this.stats.critical++;
      this.invariantViolations.push(result);
    } else if (result.severity === ValidationSeverity.ERROR) {
      this.stats.failed++;
    }
    
    if (result.fixApplied) this.stats.fixed++;
    
    const layer = result.layer || 'source';
    if (this.layers[layer]) {
      this.layers[layer].results.push(result);
      const isPass = result.valid && result.severity !== ValidationSeverity.WARNING;
      const isFail = !result.valid && result.severity !== ValidationSeverity.CRITICAL;
      if (isPass) this.layers[layer].stats.passed++;
      if (isFail) this.layers[layer].stats.failed++;
    }
    return this;
  }

  /** @param {ValidationResult[]} results */
  addResults(results) {
    results.forEach(r => this.addResult(r));
    return this;
  }

  /** @param {string} entityId @param {string} reason */
  markStale(entityId, reason) {
    this.staleEntities.push({ entity: entityId, reason, timestamp: new Date().toISOString() });
    return this;
  }

  /** Finaliza el reporte */
  complete() {
    this.completedAt = new Date().toISOString();
    this.duration = new Date(this.completedAt) - new Date(this.startedAt);
    return this;
  }

  /** @returns {boolean} */
  get allPassed() {
    return this.stats.failed === 0 && this.stats.critical === 0;
  }

  /** @returns {boolean} */
  get hasCriticalViolations() {
    return this.stats.critical > 0;
  }

  /**
   * @param {Object} [options={}] - Filter options
   * @returns {ValidationResult[]}
   */
  getResults(options = {}) {
    let filtered = this.results;
    if (options.layer) filtered = filtered.filter(r => r.layer === options.layer);
    if (options.severity) filtered = filtered.filter(r => r.severity === options.severity);
    if (options.valid !== undefined) filtered = filtered.filter(r => r.valid === options.valid);
    if (options.entity) filtered = filtered.filter(r => r.entity === options.entity);
    return filtered;
  }

  /** @returns {string} */
  toString() {
    const lines = [
      '='.repeat(70),
      'OMNYSYS VALIDATION REPORT',
      '='.repeat(70),
      `Project: ${this.projectPath}`,
      `Duration: ${this.duration}ms`,
      '',
      '📊 Summary:',
      `  Total checks: ${this.stats.total}`,
      `  Passed: ${this.stats.passed} ✅`,
      `  Warnings: ${this.stats.warnings} ⚠️`,
      `  Failed: ${this.stats.failed} ❌`,
      `  Critical: ${this.stats.critical} 🚨`,
      `  Auto-fixed: ${this.stats.fixed} 🛠️`,
    ];
    
    if (this.stats.critical > 0) {
      lines.push('', '🚨 CRITICAL INVARIANT VIOLATIONS:');
      this.invariantViolations.forEach((v, i) => lines.push(`  ${i + 1}. ${v.entity}: ${v.message}`));
    }
    
    if (this.staleEntities.length > 0) {
      lines.push('', '🔄 STALE ENTITIES (need re-analysis):');
      this.staleEntities.forEach((e, i) => lines.push(`  ${i + 1}. ${e.entity}: ${e.reason}`));
    }
    
    lines.push('', '='.repeat(70));
    return lines.join('\n');
  }

  /** @returns {Object} */
  toJSON() {
    return {
      projectPath: this.projectPath,
      omnysysPath: this.omnysysPath,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      duration: this.duration,
      stats: this.stats,
      layers: this.layers,
      results: this.results.map(r => r.toJSON()),
      invariantViolations: this.invariantViolations.map(r => r.toJSON()),
      staleEntities: this.staleEntities,
      allPassed: this.allPassed,
      hasCriticalViolations: this.hasCriticalViolations
    };
  }
}

export default ValidationReport;

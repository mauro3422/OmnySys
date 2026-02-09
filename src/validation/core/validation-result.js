/**
 * @fileoverview Validation Result - Clases para resultados de validación
 * 
 * Sigue el patrón Result/Option para manejo funcional de errores.
 * Cada validación retorna un ValidationResult que puede ser:
 * - Valid: La validación pasó
 * - Invalid: La validación falló con detalles
 * - Warning: Pasó pero con advertencias
 * 
 * @module validation/core/validation-result
 */

/**
 * Niveles de severidad para resultados de validación
 */
export const ValidationSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Tipos de validación según la arquitectura de 4 capas
 */
export const ValidationType = {
  SOURCE: 'source',           // Capa 1: Ground Truth
  DERIVATION: 'derivation',   // Capa 2: Fractal Derivations
  SEMANTIC: 'semantic',       // Capa 3: Data Flow Semantics
  CROSS_METADATA: 'cross-metadata'  // Capa 4: Cross-Metadata Insights
};

/**
 * Representa un resultado de validación individual
 */
export class ValidationResult {
  constructor(options = {}) {
    this.valid = options.valid ?? true;
    this.type = options.type || 'unknown';
    this.layer = options.layer || 'unknown';
    this.entity = options.entity || null;  // ID de la entidad validada
    this.field = options.field || null;    // Campo específico validado
    this.message = options.message || '';
    this.severity = options.severity || ValidationSeverity.INFO;
    this.expected = options.expected;
    this.actual = options.actual;
    this.details = options.details || {};
    this.timestamp = new Date().toISOString();
    this.duration = options.duration || 0;  // ms
    this.rule = options.rule || null;       // ID de la regla aplicada
    
    // Para validaciones que pueden auto-fix
    this.fixable = options.fixable || false;
    this.fixApplied = options.fixApplied || false;
    this.fixedValue = options.fixedValue;
  }

  /**
   * Crea un resultado válido
   */
  static valid(entity, field, options = {}) {
    return new ValidationResult({
      valid: true,
      entity,
      field,
      severity: ValidationSeverity.INFO,
      ...options
    });
  }

  /**
   * Crea un resultado inválido
   */
  static invalid(entity, field, expected, actual, options = {}) {
    return new ValidationResult({
      valid: false,
      entity,
      field,
      expected,
      actual,
      severity: options.severity || ValidationSeverity.ERROR,
      ...options
    });
  }

  /**
   * Crea un warning
   */
  static warning(entity, field, message, options = {}) {
    return new ValidationResult({
      valid: true,
      entity,
      field,
      message,
      severity: ValidationSeverity.WARNING,
      ...options
    });
  }

  /**
   * Crea un resultado crítico (invariant violada)
   */
  static critical(entity, field, expected, actual, options = {}) {
    return new ValidationResult({
      valid: false,
      entity,
      field,
      expected,
      actual,
      severity: ValidationSeverity.CRITICAL,
      ...options
    });
  }

  /**
   * Marca como fixeado
   */
  markFixed(fixedValue) {
    this.fixApplied = true;
    this.fixedValue = fixedValue;
    this.valid = true;
    this.message = `${this.message} [AUTO-FIXED]`;
    return this;
  }

  /**
   * Formatea para logging
   */
  toString() {
    const icon = this.valid ? '✅' : this.severity === ValidationSeverity.CRITICAL ? '🚨' : '❌';
    const entityStr = this.entity ? `[${this.entity}]` : '';
    const fieldStr = this.field ? `.${this.field}` : '';
    
    let str = `${icon} ${entityStr}${fieldStr}: ${this.message}`;
    
    if (!this.valid && this.expected !== undefined && this.actual !== undefined) {
      str += `\n   Expected: ${JSON.stringify(this.expected)}`;
      str += `\n   Actual: ${JSON.stringify(this.actual)}`;
    }
    
    if (this.fixApplied) {
      str += `\n   🛠️  Fixed to: ${JSON.stringify(this.fixedValue)}`;
    }
    
    return str;
  }

  /**
   * Convierte a objeto plano para serialización
   */
  toJSON() {
    return {
      valid: this.valid,
      type: this.type,
      layer: this.layer,
      entity: this.entity,
      field: this.field,
      message: this.message,
      severity: this.severity,
      expected: this.expected,
      actual: this.actual,
      details: this.details,
      timestamp: this.timestamp,
      duration: this.duration,
      rule: this.rule,
      fixable: this.fixable,
      fixApplied: this.fixApplied,
      fixedValue: this.fixedValue
    };
  }
}

/**
 * Reporte completo de validación
 */
export class ValidationReport {
  constructor(options = {}) {
    this.projectPath = options.projectPath || '';
    this.omnysysPath = options.omnysysPath || '';
    this.startedAt = new Date().toISOString();
    this.completedAt = null;
    this.results = [];
    this.invariantViolations = [];
    this.staleEntities = [];
    this.stats = {
      total: 0,
      passed: 0,
      warnings: 0,
      failed: 0,
      critical: 0,
      fixed: 0
    };
    this.layers = {
      source: { results: [], stats: { passed: 0, failed: 0 } },
      derivation: { results: [], stats: { passed: 0, failed: 0 } },
      semantic: { results: [], stats: { passed: 0, failed: 0 } },
      crossMetadata: { results: [], stats: { passed: 0, failed: 0 } }
    };
    this.duration = 0;
  }

  /**
   * Agrega un resultado al reporte
   */
  addResult(result) {
    this.results.push(result);
    this.stats.total++;
    
    if (result.valid) {
      if (result.severity === ValidationSeverity.WARNING) {
        this.stats.warnings++;
      } else {
        this.stats.passed++;
      }
    } else {
      switch (result.severity) {
        case ValidationSeverity.CRITICAL:
          this.stats.critical++;
          this.invariantViolations.push(result);
          break;
        case ValidationSeverity.ERROR:
          this.stats.failed++;
          break;
      }
    }
    
    if (result.fixApplied) {
      this.stats.fixed++;
    }
    
    // Agregar a la capa correspondiente
    const layer = result.layer || 'source';
    if (this.layers[layer]) {
      this.layers[layer].results.push(result);
      if (result.valid && result.severity !== ValidationSeverity.WARNING) {
        this.layers[layer].stats.passed++;
      } else if (!result.valid && result.severity !== ValidationSeverity.CRITICAL) {
        this.layers[layer].stats.failed++;
      }
    }
    
    return this;
  }

  /**
   * Agrega múltiples resultados
   */
  addResults(results) {
    results.forEach(r => this.addResult(r));
    return this;
  }

  /**
   * Marca una entidad como stale
   */
  markStale(entityId, reason) {
    this.staleEntities.push({ entity: entityId, reason, timestamp: new Date().toISOString() });
    return this;
  }

  /**
   * Finaliza el reporte
   */
  complete() {
    this.completedAt = new Date().toISOString();
    this.duration = new Date(this.completedAt) - new Date(this.startedAt);
    return this;
  }

  /**
   * Verifica si todas las validaciones pasaron
   */
  get allPassed() {
    return this.stats.failed === 0 && this.stats.critical === 0;
  }

  /**
   * Verifica si hay invariantes críticas violadas
   */
  get hasCriticalViolations() {
    return this.stats.critical > 0;
  }

  /**
   * Obtiene resultados filtrados
   */
  getResults(options = {}) {
    let filtered = this.results;
    
    if (options.layer) {
      filtered = filtered.filter(r => r.layer === options.layer);
    }
    
    if (options.severity) {
      filtered = filtered.filter(r => r.severity === options.severity);
    }
    
    if (options.valid !== undefined) {
      filtered = filtered.filter(r => r.valid === options.valid);
    }
    
    if (options.entity) {
      filtered = filtered.filter(r => r.entity === options.entity);
    }
    
    return filtered;
  }

  /**
   * Genera resumen para CLI
   */
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
      this.invariantViolations.forEach((v, i) => {
        lines.push(`  ${i + 1}. ${v.entity}: ${v.message}`);
      });
    }
    
    if (this.staleEntities.length > 0) {
      lines.push('', '🔄 STALE ENTITIES (need re-analysis):');
      this.staleEntities.forEach((e, i) => {
        lines.push(`  ${i + 1}. ${e.entity}: ${e.reason}`);
      });
    }
    
    lines.push('', '='.repeat(70));
    
    return lines.join('\n');
  }

  /**
   * Convierte a JSON completo
   */
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

/**
 * Helper para crear un reporte rápido
 */
export function createReport(options) {
  return new ValidationReport(options);
}

export default { ValidationResult, ValidationReport, ValidationSeverity, ValidationType };

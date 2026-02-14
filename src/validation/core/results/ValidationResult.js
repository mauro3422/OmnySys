/**
 * @fileoverview ValidationResult class
 * 
 * Represents a single validation result with full details
 * about the validation outcome.
 * 
 * @module validation/core/results/ValidationResult
 */

import { ValidationSeverity } from './constants.js';

/**
 * Representa un resultado de validación individual
 */
export class ValidationResult {
  /**
   * Creates a new ValidationResult
   * @param {Object} options - Result options
   * @param {boolean} [options.valid=true] - Whether validation passed
   * @param {string} [options.type='unknown'] - Validation type
   * @param {string} [options.layer='unknown'] - Layer name
   * @param {string|null} [options.entity=null] - Entity ID
   * @param {string|null} [options.field=null] - Field name
   * @param {string} [options.message=''] - Result message
   * @param {string} [options.severity] - Severity level
   * @param {*} [options.expected] - Expected value
   * @param {*} [options.actual] - Actual value
   * @param {Object} [options.details={}] - Additional details
   * @param {number} [options.duration=0] - Duration in ms
   * @param {string|null} [options.rule=null] - Rule ID
   * @param {boolean} [options.fixable=false] - Can be auto-fixed
   * @param {boolean} [options.fixApplied=false] - Fix was applied
   * @param {*} [options.fixedValue] - Value after fix
   */
  constructor(options = {}) {
    this.valid = options.valid ?? true;
    this.type = options.type || 'unknown';
    this.layer = options.layer || 'unknown';
    this.entity = options.entity || null;
    this.field = options.field || null;
    this.message = options.message || '';
    this.severity = options.severity || ValidationSeverity.INFO;
    this.expected = options.expected;
    this.actual = options.actual;
    this.details = options.details || {};
    this.timestamp = new Date().toISOString();
    this.duration = options.duration || 0;
    this.rule = options.rule || null;
    this.fixable = options.fixable || false;
    this.fixApplied = options.fixApplied || false;
    this.fixedValue = options.fixedValue;
  }

  /**
   * Crea un resultado válido
   * @param {string} entity - Entity ID
   * @param {string} field - Field name
   * @param {Object} [options={}] - Additional options
   * @returns {ValidationResult}
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
   * @param {string} entity - Entity ID
   * @param {string} field - Field name
   * @param {*} expected - Expected value
   * @param {*} actual - Actual value
   * @param {Object} [options={}] - Additional options
   * @returns {ValidationResult}
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
   * @param {string} entity - Entity ID
   * @param {string} field - Field name
   * @param {string} message - Warning message
   * @param {Object} [options={}] - Additional options
   * @returns {ValidationResult}
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
   * @param {string} entity - Entity ID
   * @param {string} field - Field name
   * @param {*} expected - Expected value
   * @param {*} actual - Actual value
   * @param {Object} [options={}] - Additional options
   * @returns {ValidationResult}
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
   * @param {*} fixedValue - The fixed value
   * @returns {ValidationResult} This instance for chaining
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
   * @returns {string} Formatted string
   */
  toString() {
    const icon = this.valid 
      ? '✅' 
      : this.severity === ValidationSeverity.CRITICAL 
        ? '🚨' 
        : '❌';
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
   * @returns {Object} Plain object representation
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

export default ValidationResult;

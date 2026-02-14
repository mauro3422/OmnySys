/**
 * @fileoverview Validation Result
 * 
 * Data structure for validation results.
 * Tracks errors, warnings, and statistics.
 * 
 * @module data-integrity-validator/reports/validation-result
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('integrity-validator');

/**
 * Validation result container
 * 
 * @class ValidationResult
 */
export class ValidationResult {
  constructor() {
    this.valid = true;
    this.errors = [];
    this.warnings = [];
    this.stats = {
      atomsChecked: 0,
      moleculesChecked: 0,
      filesChecked: 0,
      referencesChecked: 0
    };
  }

  /**
   * Adds an error to the result
   * 
   * @param {string} message - Error message
   * @param {Object} [context={}] - Additional context
   */
  addError(message, context = {}) {
    this.valid = false;
    this.errors.push({
      message,
      context,
      timestamp: new Date().toISOString()
    });
    logger.error(`Integrity Error: ${message}`, context);
  }

  /**
   * Adds a warning to the result
   * 
   * @param {string} message - Warning message
   * @param {Object} [context={}] - Additional context
   */
  addWarning(message, context = {}) {
    this.warnings.push({
      message,
      context,
      timestamp: new Date().toISOString()
    });
    logger.warn(`Integrity Warning: ${message}`, context);
  }

  /**
   * Gets summary statistics
   * @returns {Object}
   */
  getSummary() {
    return {
      valid: this.valid,
      errors: this.errors.length,
      warnings: this.warnings.length,
      stats: { ...this.stats }
    };
  }

  /**
   * Checks if result has errors
   * @returns {boolean}
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * Checks if result has warnings
   * @returns {boolean}
   */
  hasWarnings() {
    return this.warnings.length > 0;
  }
}

export default ValidationResult;

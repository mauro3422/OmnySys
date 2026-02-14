/**
 * @fileoverview Base Error Classifier
 * 
 * Core classification logic for analyzing and categorizing errors.
 * 
 * @module core/error-guardian/handlers/error-classifier/classifiers/base-classifier
 */

import { createLogger } from '../../../../utils/logger.js';
import { SEVERITY, ERROR_PATTERNS } from '../patterns/constants.js';

const logger = createLogger('OmnySys:error:classifier');

/**
 * Error classification result
 * @typedef {Object} ErrorClassification
 * @property {string} type - Error type identifier
 * @property {string} severity - Severity level
 * @property {boolean} autoFixable - Whether error can be auto-fixed
 * @property {string} suggestion - Human-readable suggestion
 * @property {string[]} commonFixes - List of common fixes
 * @property {string} category - Error category
 * @property {string} match - Matched pattern string
 * @property {Error} originalError - Original error object
 */

/**
 * Error Classifier
 */
export class ErrorClassifier {
  constructor(customPatterns = {}) {
    this.patterns = { ...ERROR_PATTERNS, ...customPatterns };
    this.classificationHistory = [];
  }

  /**
   * Analyze an error and determine its classification
   * @param {Error} error - Error to analyze
   * @returns {ErrorClassification} - Classification result
   */
  classify(error) {
    const errorString = error.stack || error.message || String(error);

    for (const [type, config] of Object.entries(this.patterns)) {
      const match = errorString.match(config.pattern);
      if (match) {
        const classification = {
          type,
          severity: config.severity,
          autoFixable: config.autoFixable,
          suggestion: config.suggestion(match),
          commonFixes: config.commonFixes || [],
          category: config.category || 'UNKNOWN',
          match: match[0],
          originalError: error
        };

        this.recordClassification(classification);
        return classification;
      }
    }

    // Unknown error
    const unknownClassification = {
      type: 'UNKNOWN',
      severity: SEVERITY.HIGH,
      autoFixable: false,
      suggestion: 'Error no catalogado. Revisar stack trace completo.',
      commonFixes: [
        'Buscar el error en Google/StackOverflow',
        'Revisar logs completos',
        'Reportar issue con stack trace'
      ],
      category: 'UNKNOWN',
      match: errorString.substring(0, 100),
      originalError: error
    };

    this.recordClassification(unknownClassification);
    return unknownClassification;
  }

  /**
   * Record classification for analytics
   * @param {ErrorClassification} classification
   */
  recordClassification(classification) {
    this.classificationHistory.push({
      timestamp: new Date().toISOString(),
      type: classification.type,
      severity: classification.severity,
      category: classification.category
    });

    // Keep only last 100 classifications
    if (this.classificationHistory.length > 100) {
      this.classificationHistory.shift();
    }
  }

  /**
   * Add custom error pattern
   * @param {string} type - Pattern identifier
   * @param {Object} config - Pattern configuration
   */
  addPattern(type, config) {
    this.patterns[type] = config;
    logger.info(`📋 Added custom error pattern: ${type}`);
  }

  /**
   * Remove a pattern
   * @param {string} type - Pattern to remove
   */
  removePattern(type) {
    delete this.patterns[type];
  }
}

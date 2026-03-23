/**
 * @fileoverview Base Error Classifier
 * 
 * Core classification logic for analyzing and categorizing errors.
 * 
 * @module core/error-guardian/handlers/error-classifier/classifiers/base-classifier
 */

import { createLogger } from '../../../../utils/logger.js';
import { SEVERITY, ERROR_PATTERNS } from '../patterns/constants.js';
import { getClassifierStats } from '../utils/stats.js';
import {
  buildClassifierPatterns,
  selectMatchingPattern,
  buildClassification,
  recordClassificationHistory
} from './base-classifier-helpers.js';

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
    this.patterns = buildClassifierPatterns(customPatterns, ERROR_PATTERNS);
    this.classificationHistory = [];
  }

  /**
   * Get classification statistics
   * @returns {Object} - Statistics
   */
  getClassifierStats() {
    return getClassifierStats(this.classificationHistory);
  }

  /**
   * Check if error is quiet
   * @param {Object} classification
   * @returns {boolean}
   */
  isQuietError(classification) {
    return classification.severity === SEVERITY.LOW;
  }

  /**
   * Get patterns by category
   * @param {string} category
   * @returns {Object}
   */
  getPatternsByCategory(category) {
    return Object.entries(this.patterns)
      .filter(([_, config]) => config.category === category)
      .reduce((acc, [type, config]) => {
        acc[type] = config;
        return acc;
      }, {});
  }

  /**
   * Clear classification history
   */
  clearHistory() {
    this.classificationHistory = [];
  }

  /**
   * Analyze an error and determine its classification
   * @param {Error} error - Error to analyze
   * @returns {ErrorClassification} - Classification result
   */
  determineErrorClassification(error) {
    const errorString = error.stack || error.message || String(error);
    const matchResult = selectMatchingPattern(errorString, this.patterns);
    const classification = buildClassification(error, matchResult);
    this.recordClassification(classification);
    return classification;
  }

  /**
   * Record classification for analytics
   * @param {ErrorClassification} classification
   */
  recordClassification(classification) {
    recordClassificationHistory(this.classificationHistory, classification);
  }

  /**
   * Add custom error pattern
   * @param {string} type - Pattern identifier
   * @param {Object} config - Pattern configuration
   */
  registerPattern(type, config) {
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

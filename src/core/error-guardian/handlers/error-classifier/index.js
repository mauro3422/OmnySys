/**
 * @fileoverview error-classifier/index.js
 * 
 * Error Classification System
 * 
 * Analyzes errors and determines their type, severity, and
 * potential solutions based on pattern matching.
 * 
 * @module core/error-guardian/handlers/error-classifier
 */

import { SEVERITY, ERROR_PATTERNS } from './patterns/constants.js';
import { ErrorClassifier } from './classifiers/base-classifier.js';
import { getStats } from './utils/stats.js';

// Extend ErrorClassifier with utility methods
ErrorClassifier.prototype.getStats = function() {
  return getStats(this.classificationHistory);
};

ErrorClassifier.prototype.isQuietError = function(classification) {
  return classification.severity === SEVERITY.LOW;
};

ErrorClassifier.prototype.getPatternsByCategory = function(category) {
  return Object.entries(this.patterns)
    .filter(([_, config]) => config.category === category)
    .reduce((acc, [type, config]) => {
      acc[type] = config;
      return acc;
    }, {});
};

ErrorClassifier.prototype.clearHistory = function() {
  this.classificationHistory = [];
};

export { SEVERITY, ERROR_PATTERNS, ErrorClassifier };
export default ErrorClassifier;

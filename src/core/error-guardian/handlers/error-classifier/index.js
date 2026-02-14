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
import { getStats, isQuietError, getPatternsByCategory, clearHistory } from './utils/stats.js';

// Extend ErrorClassifier with utility methods
ErrorClassifier.prototype.getStats = function() {
  return getStats(this.classificationHistory);
};

ErrorClassifier.prototype.isQuietError = function(classification) {
  return isQuietError(classification, SEVERITY);
};

ErrorClassifier.prototype.getPatternsByCategory = function(category) {
  return getPatternsByCategory(this.patterns, category);
};

ErrorClassifier.prototype.clearHistory = function() {
  clearHistory(this);
};

export { SEVERITY, ERROR_PATTERNS, ErrorClassifier };
export default ErrorClassifier;

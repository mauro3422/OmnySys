/**
 * @fileoverview Error Classifier Statistics
 * 
 * Utility functions for classification statistics and history management.
 * 
 * @module core/error-guardian/handlers/error-classifier/utils/stats
 */

/**
 * Get classification statistics
 * @param {Array} history - Classification history
 * @returns {Object} - Statistics by type and severity
 */
export function getStats(history) {
  const stats = {
    byType: {},
    bySeverity: {},
    byCategory: {},
    total: history.length
  };

  for (const entry of history) {
    stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;
    stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1;
    stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
  }

  return stats;
}

/**
 * Check if error should be logged loudly or quietly
 * @param {Object} classification
 * @param {Object} SEVERITY - Severity constants
 * @returns {boolean}
 */
export function isQuietError(classification, SEVERITY) {
  return classification.severity === SEVERITY.LOW;
}

/**
 * Get patterns by category
 * @param {Object} patterns - All patterns
 * @param {string} category - Category to filter
 * @returns {Object}
 */
export function getPatternsByCategory(patterns, category) {
  return Object.entries(patterns)
    .filter(([_, config]) => config.category === category)
    .reduce((acc, [type, config]) => {
      acc[type] = config;
      return acc;
    }, {});
}

/**
 * Clear classification history
 */
export function clearHistory(classifier) {
  classifier.classificationHistory = [];
}

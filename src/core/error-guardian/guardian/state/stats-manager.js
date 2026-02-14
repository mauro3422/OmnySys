/**
 * @fileoverview Stats Manager
 * 
 * Manage error statistics
 * 
 * @module error-guardian/guardian/state/stats-manager
 */

/**
 * Create initial stats
 * @returns {Object} Initial stats
 */
export function createInitialStats() {
  return {
    totalErrors: 0,
    byType: {},
    bySeverity: {},
    autoFixed: 0,
    prevented: 0
  };
}

/**
 * Reset stats
 * @param {Object} stats - Stats object to reset
 */
export function resetStats(stats) {
  stats.totalErrors = 0;
  stats.byType = {};
  stats.bySeverity = {};
  stats.autoFixed = 0;
  stats.prevented = 0;
}

/**
 * Aggregate stats from components
 * @param {Object} stats - Base stats
 * @param {Object} components - Component stats
 * @returns {Object} Aggregated stats
 */
export function aggregateStats(stats, components) {
  const { classifier, recovery, circuitBreaker, errorLog, health } = components;

  return {
    ...stats,
    recentErrors: errorLog.slice(-10),
    health,
    classification: classifier?.getStats(),
    recovery: recovery?.getStats(),
    circuits: circuitBreaker?.getAllStates()
  };
}

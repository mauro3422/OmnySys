/**
 * @fileoverview Health Calculator
 * 
 * Calculate system health based on error statistics
 * 
 * @module error-guardian/guardian/health/health-calculator
 */

/**
 * Calculate system health
 * @param {Object} stats - Error statistics
 * @returns {string} Health status
 */
export function calculateHealth(stats) {
  const criticalCount = stats.bySeverity?.CRITICAL || 0;
  const highCount = stats.bySeverity?.HIGH || 0;

  if (criticalCount > 5) return 'CRITICAL';
  if (criticalCount > 0 || highCount > 10) return 'WARNING';
  if (highCount > 0) return 'DEGRADED';
  return 'HEALTHY';
}

/**
 * Get health recommendations
 * @param {string} health - Health status
 * @returns {Array} Recommendations
 */
export function getHealthRecommendations(health) {
  const recommendations = {
    CRITICAL: [
      'Review critical errors immediately',
      'Consider restarting the system',
      'Check external dependencies'
    ],
    WARNING: [
      'Monitor error rates closely',
      'Review recent changes',
      'Check resource usage'
    ],
    DEGRADED: [
      'Some functionality may be impaired',
      'Review error patterns'
    ],
    HEALTHY: [
      'System operating normally'
    ]
  };

  return recommendations[health] || [];
}

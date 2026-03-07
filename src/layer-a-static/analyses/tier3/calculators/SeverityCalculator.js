/**
 * @fileoverview SeverityCalculator.js
 * 
 * Calculates severity from scores.
 * 
 * @module analyses/tier3/calculators/SeverityCalculator
 */

import { scoreToSeverity } from '#shared/compiler/index.js';

/**
 * Calculate severity from score
 * @param {number} score - Score 0-10
 * @returns {string} - Severity level
 */
export function calculateScoreSeverity(score) {
  return scoreToSeverity(score);
}

/**
 * Get severity threshold
 * @param {string} severity - Severity level
 * @returns {number} - Threshold score
 */
export function getSeverityThreshold(severity) {
  const thresholds = {
    critical: 8,
    high: 6,
    medium: 3,
    low: 0
  };
  return thresholds[severity] || 0;
}

export default calculateScoreSeverity;

/**
 * @fileoverview CouplingScore.js
 * 
 * Calculates coupling risk score.
 * 
 * @module analyses/tier3/factors/CouplingScore
 */

/**
 * Calculate coupling risk score
 * @returns {Object} - Score and explanation
 */
export function calculateCouplingScore(graphMetrics) {
  const circularDependencies = graphMetrics.problematicCycles || 0;
  const coupledFiles = graphMetrics.coupledFiles || 0;

  let score = 0;
  let explanation;

  if (circularDependencies > 0) {
    score = 1;
    explanation = 'Circular dependency detected';
  } else if (coupledFiles >= 3) {
    score = 1;
    explanation = 'Tightly coupled with other files';
  }

  return {
    score,
    explanation,
    metrics: { circularDependencies, coupledFiles }
  };
}

export default calculateCouplingScore;

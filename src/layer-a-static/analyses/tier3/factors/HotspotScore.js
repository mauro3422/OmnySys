/**
 * @fileoverview HotspotScore.js
 * 
 * Calculates hotspot risk score.
 * 
 * @module analyses/tier3/factors/HotspotScore
 */

/**
 * Calculate hotspot risk score
 * @returns {Object} - Score and explanation
 */
export function calculateHotspotScore(graphMetrics) {
  const inDegree = graphMetrics.inDegree || 0;
  const outDegree = graphMetrics.outDegree || 0;

  let score = 0;
  const explanations = [];

  if (inDegree >= 15) {
    score = 2;
    explanations.push(`Critical hotspot (used by ${inDegree} files)`);
  } else if (inDegree >= 8) {
    score = 1;
    explanations.push(`Hotspot file (used by ${inDegree} files)`);
  }

  if (outDegree >= 20) {
    score = Math.max(score, 2);
    explanations.push(`High dependencies (${outDegree})`);
  } else if (outDegree >= 10) {
    score = Math.max(score, 1);
    explanations.push(`Multiple dependencies (${outDegree})`);
  }

  return {
    score,
    explanation: explanations.join('; ') || undefined,
    metrics: { inDegree, outDegree }
  };
}

export default calculateHotspotScore;

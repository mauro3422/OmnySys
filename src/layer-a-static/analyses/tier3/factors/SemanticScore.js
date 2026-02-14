/**
 * @fileoverview SemanticScore.js
 * 
 * Calculates semantic connection score.
 * 
 * @module analyses/tier3/factors/SemanticScore
 */

/**
 * Calculate semantic connection score
 * @returns {Object} - Score and explanation
 */
export function calculateSemanticScore(semanticConnections) {
  const safeConnections = semanticConnections || [];
  const connectionCount = safeConnections.length;
  const highSeverityConnections = safeConnections.filter(
    c => c.severity === 'critical' || c.severity === 'high'
  ).length;

  let score = 0;
  const explanations = [];

  if (connectionCount >= 8) {
    score = 3;
    explanations.push(`Multiple semantic connections (${connectionCount})`);
  } else if (connectionCount >= 5) {
    score = 2;
    explanations.push(`Several semantic connections (${connectionCount})`);
  } else if (connectionCount >= 2) {
    score = 1;
    explanations.push(`Some semantic connections (${connectionCount})`);
  }

  if (highSeverityConnections > 0) {
    score = Math.max(score, 2);
    explanations.push(`High severity connections (${highSeverityConnections})`);
  }

  return {
    score,
    explanation: explanations.join('; ') || undefined,
    metrics: { connectionCount, highSeverityConnections }
  };
}

export default calculateSemanticScore;

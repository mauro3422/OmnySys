/**
 * @fileoverview SideEffectScore.js
 * 
 * Calculates side effect score.
 * 
 * @module analyses/tier3/factors/SideEffectScore
 */

/**
 * Calculate side effect score
 * @returns {Object} - Score and explanation
 */
export function calculateSideEffectScore(sideEffects) {
  const sideEffectCount = Object.values(sideEffects).filter(Boolean).length || 0;

  let score = 0;
  const explanations = [];

  if (sideEffects.makesNetworkCalls && sideEffects.modifiesGlobalState) {
    score = 3;
    explanations.push('Network calls + global state modification');
  } else if (sideEffectCount >= 5) {
    score = 3;
    explanations.push(`Many side effects (${sideEffectCount})`);
  } else if (sideEffectCount >= 3) {
    score = 2;
    explanations.push(`Multiple side effects (${sideEffectCount})`);
  } else if (sideEffectCount >= 1) {
    score = 1;
    explanations.push(`Some side effects (${sideEffectCount})`);
  }

  // Additional penalties for critical types
  if (sideEffects.modifiesGlobalState) {
    score = Math.max(score, 2);
  }

  if (sideEffects.makesNetworkCalls) {
    score = Math.max(score, 2);
  }

  return {
    score,
    explanation: explanations.join('; ') || undefined,
    metrics: { sideEffectCount }
  };
}

export default calculateSideEffectScore;

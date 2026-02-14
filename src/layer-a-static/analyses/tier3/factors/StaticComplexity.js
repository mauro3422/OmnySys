/**
 * @fileoverview StaticComplexity.js
 * 
 * Calculates static complexity score.
 * 
 * @module analyses/tier3/factors/StaticComplexity
 */

/**
 * Calculate static complexity score
 * @returns {Object} - Score and explanation
 */
export function calculateStaticComplexity(fileAnalysis) {
  const functionCount = fileAnalysis.functions?.length || 0;
  const importCount = fileAnalysis.imports?.length || 0;
  const exportCount = fileAnalysis.exports?.length || 0;

  let score = 0;
  const explanations = [];

  if (functionCount >= 20) {
    score = 3;
    explanations.push(`High function count (${functionCount})`);
  } else if (functionCount >= 10) {
    score = 2;
    explanations.push(`Medium function count (${functionCount})`);
  } else if (functionCount >= 5) {
    score = 1;
    explanations.push(`Low function count (${functionCount})`);
  }

  if (importCount >= 20) {
    score = Math.max(score, 3);
    explanations.push(`High import count (${importCount})`);
  } else if (importCount >= 10) {
    score = Math.max(score, 2);
    explanations.push(`Medium import count (${importCount})`);
  }

  return {
    score,
    explanation: explanations.join('; ') || undefined,
    metrics: { functionCount, importCount, exportCount }
  };
}

export default calculateStaticComplexity;

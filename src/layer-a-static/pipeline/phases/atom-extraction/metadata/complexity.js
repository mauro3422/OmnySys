/**
 * @fileoverview complexity.js
 *
 * Cyclomatic complexity calculation for atoms
 *
 * @module pipeline/phases/atom-extraction/metadata/complexity
 */

/**
 * Calculate cyclomatic complexity of code
 * @param {string} code - Source code to analyze
 * @returns {number} - Cyclomatic complexity score
 */
export function calculateComplexity(code) {
  let complexity = 1;
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /&&/g,
    /\|\|/g,
    /\?.*:/g
  ];

  patterns.forEach(pattern => {
    const matches = code.match(pattern);
    if (matches) complexity += matches.length;
  });

  return complexity;
}

export default calculateComplexity;

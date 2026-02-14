/**
 * @fileoverview Complexity Analyzer
 * 
 * Analyzes code complexity metrics including cyclomatic complexity,
 * cognitive complexity, and Big O notation estimation.
 * 
 * @module performance-impact/analyzers/complexity-analyzer
 */

/**
 * Patterns that affect cyclomatic complexity
 * @const {Array<{pattern: RegExp, weight: number}>}
 */
const COMPLEXITY_PATTERNS = [
  { pattern: /\bif\s*\(/g, weight: 1 },
  { pattern: /\belse\s+if\s*\(/g, weight: 1 },
  { pattern: /\bfor\s*\(/g, weight: 1 },
  { pattern: /\bwhile\s*\(/g, weight: 1 },
  { pattern: /\bcase\s+/g, weight: 1 },
  { pattern: /\bcatch\s*\(/g, weight: 1 },
  { pattern: /\?\s*[^?:]+\s*:/g, weight: 1 },
  { pattern: /&&|\|\|/g, weight: 0.5 }
];

/**
 * Analyzes code complexity metrics
 * 
 * @class ComplexityAnalyzer
 */
export class ComplexityAnalyzer {
  /**
   * Analyzes complexity of the given code
   * 
   * @param {string} code - Source code to analyze
   * @returns {Object} Complexity metrics
   */
  analyze(code) {
    const cyclomatic = this._calculateCyclomatic(code);
    const cognitive = this._calculateCognitive(code);
    const bigO = this._estimateBigO(code);

    return {
      cyclomatic: Math.round(cyclomatic),
      cognitive,
      bigO
    };
  }

  /**
   * Calculates cyclomatic complexity
   * @private
   * @param {string} code - Source code
   * @returns {number} Cyclomatic complexity score
   */
  _calculateCyclomatic(code) {
    let complexity = 1;

    for (const { pattern, weight } of COMPLEXITY_PATTERNS) {
      const matches = code.match(pattern) || [];
      complexity += matches.length * weight;
    }

    return complexity;
  }

  /**
   * Calculates cognitive complexity (max nesting depth)
   * @private
   * @param {string} code - Source code
   * @returns {number} Maximum nesting depth
   */
  _calculateCognitive(code) {
    let nestingDepth = 0;
    let maxNesting = 0;
    const lines = code.split('\n');

    for (const line of lines) {
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      nestingDepth += openBraces - closeBraces;
      maxNesting = Math.max(maxNesting, nestingDepth);
    }

    return maxNesting;
  }

  /**
   * Estimates Big O notation
   * @private
   * @param {string} code - Source code
   * @returns {string} Big O notation (O(1), O(n), O(n^2), O(2^n))
   */
  _estimateBigO(code) {
    const hasRecursiveCalls = /function\s+(\w+).*\{[^}]*\1\s*\(/.test(code);
    const hasNestedLoops = /for\s*\([^)]*\)\s*\{[^}]*for\s*\(/.test(code);
    const hasWhileTrue = /while\s*\(\s*true\s*\)/.test(code);

    if (hasRecursiveCalls) {
      return 'O(2^n)';
    }
    if (hasNestedLoops) {
      return 'O(n^2)';
    }
    if (/\bfor\s*\(/.test(code) || /\bwhile\s*\(/.test(code)) {
      return 'O(n)';
    }

    return 'O(1)';
  }
}

export default ComplexityAnalyzer;

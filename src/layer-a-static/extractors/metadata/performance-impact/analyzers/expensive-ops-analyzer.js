/**
 * @fileoverview Expensive Operations Analyzer
 * 
 * Detects expensive operations like array methods, DOM operations,
 * and JSON parsing that may impact performance.
 * 
 * @module performance-impact/analyzers/expensive-ops-analyzer
 */

/**
 * Array operation patterns with their performance cost
 * @const {Array<{pattern: RegExp, name: string, cost: string}>}
 */
const ARRAY_OPERATIONS = [
  { pattern: /\.map\s*\(/, name: 'Array.map', cost: 'medium' },
  { pattern: /\.filter\s*\(/, name: 'Array.filter', cost: 'medium' },
  { pattern: /\.reduce\s*\(/, name: 'Array.reduce', cost: 'medium' },
  { pattern: /\.sort\s*\(/, name: 'Array.sort', cost: 'high' },
  { pattern: /\.flat\s*\(/, name: 'Array.flat', cost: 'high' },
  { pattern: /\.find\s*\(/, name: 'Array.find', cost: 'low' }
];

/**
 * DOM operation patterns
 * @const {Array<{pattern: RegExp, name: string}>}
 */
const DOM_OPERATIONS = [
  { pattern: /querySelectorAll\s*\(/, name: 'querySelectorAll' },
  { pattern: /getElementsByTagName\s*\(/, name: 'getElementsByTagName' },
  { pattern: /innerHTML\s*=/, name: 'innerHTML write' },
  { pattern: /appendChild\s*\(/, name: 'appendChild loop' }
];

/**
 * Analyzes expensive operations in code
 * 
 * @class ExpensiveOperationsAnalyzer
 */
export class ExpensiveOperationsAnalyzer {
  /**
   * Detects expensive operations in code
   * 
   * @param {string} code - Source code to analyze
   * @param {Object} performanceHints - Existing performance hints
   * @returns {Object} Expensive operations metrics
   */
  analyze(code, performanceHints = {}) {
    const metrics = {
      nestedLoops: 0,
      recursion: false,
      blockingOps: [],
      heavyCalls: []
    };

    // Use existing hints
    if (performanceHints) {
      metrics.nestedLoops = performanceHints.nestedLoops?.length || 0;
      metrics.recursion = performanceHints.hasRecursion || false;
      metrics.blockingOps = performanceHints.blockingOperations || [];
    }

    // Detect array operations
    this._detectArrayOperations(code, metrics);

    // Detect JSON operations
    this._detectJsonOperations(code, metrics);

    // Detect DOM operations
    this._detectDomOperations(code, metrics);

    return metrics;
  }

  /**
   * Detects array method calls
   * @private
   * @param {string} code - Source code
   * @param {Object} metrics - Metrics object to populate
   */
  _detectArrayOperations(code, metrics) {
    for (const { pattern, name, cost } of ARRAY_OPERATIONS) {
      const matches = code.match(pattern);
      if (matches) {
        metrics.heavyCalls.push({
          operation: name,
          cost,
          count: matches.length
        });
      }
    }
  }

  /**
   * Detects JSON parse/stringify operations
   * @private
   * @param {string} code - Source code
   * @param {Object} metrics - Metrics object to populate
   */
  _detectJsonOperations(code, metrics) {
    if (/JSON\.parse\s*\(|JSON\.stringify\s*\(/.test(code)) {
      const context = code.match(/JSON\.(parse|stringify)\s*\([^)]+/);
      if (context && context[0].length > 50) {
        metrics.heavyCalls.push({
          operation: 'JSON.parse/stringify (large)',
          cost: 'high'
        });
      }
    }
  }

  /**
   * Detects DOM operations
   * @private
   * @param {string} code - Source code
   * @param {Object} metrics - Metrics object to populate
   */
  _detectDomOperations(code, metrics) {
    for (const { pattern, name } of DOM_OPERATIONS) {
      if (pattern.test(code)) {
        metrics.heavyCalls.push({
          operation: name,
          cost: 'medium'
        });
      }
    }
  }
}

export default ExpensiveOperationsAnalyzer;

/**
 * @fileoverview Flow Checker
 * 
 * Analyzes business flow to determine if operations are sequential.
 * 
 * @module race-detector/mitigation/flow-checker
 * @version 1.0.0
 */

/**
 * Check if two accesses are in the same business flow
 * @param {Object} access1 - First access
 * @param {Object} access2 - Second access
 * @param {Object} project - Project data
 * @param {Array} strategies - Available strategies
 * @returns {boolean} - True if same flow
 */
export function sameBusinessFlow(access1, access2, project, strategies = []) {
  // Use strategy's implementation if available
  for (const strategy of strategies) {
    if (strategy.sameBusinessFlow) {
      return strategy.sameBusinessFlow(access1, access2, project);
    }
  }
  
  // Default: same file and sequential in code
  if (access1.file !== access2.file) return false;
  
  // If both in same function, check line numbers
  if (access1.atom === access2.atom) {
    const line1 = access1.line || 0;
    const line2 = access2.line || 0;
    return Math.abs(line1 - line2) < 10; // Within 10 lines = likely sequential
  }
  
  return false;
}

/**
 * Detailed business flow analysis
 * @param {Object} access1 - First access
 * @param {Object} access2 - Second access
 * @param {Object} project - Project data
 * @param {Array} strategies - Available strategies
 * @returns {Object|null} - Flow analysis or null
 */
export function analyzeBusinessFlow(access1, access2, project, strategies = []) {
  const isSameFlow = sameBusinessFlow(access1, access2, project, strategies);
  
  if (!isSameFlow) return null;
  
  return {
    type: 'sequential',
    description: 'Operations are always sequential in same flow',
    confidence: 'medium',
    file: access1.file
  };
}

/**
 * @fileoverview code-utils.js
 * 
 * Utility functions for code analysis.
 * 
 * @module race-detector/utils/code-utils
 */

/**
 * Get code context for an access
 * @param {Object} access - Access point
 * @returns {string|null} - Code context or null
 */
export function getCodeContext(access) {
  return access.code || null;
}

/**
 * Extract variable name from code
 * @param {string} code - Code string
 * @returns {string|null} - Variable name
 */
export function extractVariable(code) {
  const match = code.match(/(\w+)\s*[=+\-\*/]/);
  return match ? match[1] : null;
}

/**
 * Check if code contains async operations
 * @param {string} code - Code string
 * @returns {boolean} - True if async
 */
export function hasAsyncOperation(code) {
  const asyncPatterns = [
    /\bawait\b/,
    /\basync\b/,
    /\.then\s*\(/,
    /\.catch\s*\(/,
    /Promise\./,
    /new\s+Promise/
  ];
  return asyncPatterns.some(p => p.test(code));
}

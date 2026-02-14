/**
 * line-utils.js
 * Utility functions for line number calculations
 */

/**
 * Get line number for a position in code
 * @param {string} code - Source code
 * @param {number} position - Character position
 * @returns {number} - Line number (1-based)
 */
export function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}

/**
 * @fileoverview Code utilities
 * @module molecular-chains/argument-mapper/utils/code-utils
 */

/**
 * Finds usages of a variable in code after a specific line
 * @param {string} varName - Variable name
 * @param {string} code - Source code
 * @param {number} afterLine - Line number to start search from
 * @returns {Array} Usage locations
 */
export function findVariableUsages(varName, code, afterLine) {
  const usages = [];
  const lines = code.split('\n');
  
  for (let i = afterLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(varName)) {
      usages.push({
        line: i + 1,
        context: line.trim()
      });
    }
  }
  
  return usages;
}

/**
 * Escapes special regex characters
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
export function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default { findVariableUsages, escapeRegex };

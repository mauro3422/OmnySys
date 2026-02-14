/**
 * parsers/classes.js
 * Extract class definitions from TypeScript code
 */

import { getLineNumber } from '../utils/line-utils.js';

// Pattern: class X extends Y implements Z
const CLASS_PATTERN = /class\s+(\w+)\s*(?:extends\s+(\w+))?\s*(?:implements\s+([^{]+))?\s*\{/g;

/**
 * Extract classes from TypeScript code
 * @param {string} code - Source code
 * @returns {Array} - Array of class definitions
 */
export function extractClasses(code) {
  const classes = [];
  let match;

  while ((match = CLASS_PATTERN.exec(code)) !== null) {
    const implementsList = match[3] ? match[3].split(',').map(i => i.trim()) : [];

    classes.push({
      type: 'class',
      name: match[1],
      extends: match[2] || null,
      implements: implementsList,
      line: getLineNumber(code, match.index)
    });
  }

  return classes;
}

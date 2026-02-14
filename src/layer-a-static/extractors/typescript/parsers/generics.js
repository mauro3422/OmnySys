/**
 * parsers/generics.js
 * Extract generic function definitions from TypeScript code
 */

import { getLineNumber } from '../utils/line-utils.js';

// Patterns for generic functions
const GENERIC_FUNC_PATTERN = /function\s+(\w+)\s*<([^>]+)>\s*\(/g;
const GENERIC_ARROW_PATTERN = /const\s+(\w+)\s*=<([^>]+)>\s*\(/g;

/**
 * Extract generic functions from TypeScript code
 * @param {string} code - Source code
 * @returns {Array} - Array of generic definitions
 */
export function extractGenerics(code) {
  const generics = [];
  let match;

  // Generic functions: function name<T>(x: T): T
  while ((match = GENERIC_FUNC_PATTERN.exec(code)) !== null) {
    generics.push({
      type: 'generic_function',
      name: match[1],
      constraints: match[2],
      line: getLineNumber(code, match.index)
    });
  }

  // Generic arrows: const name = <T>(x: T) =>
  while ((match = GENERIC_ARROW_PATTERN.exec(code)) !== null) {
    generics.push({
      type: 'generic_arrow',
      name: match[1],
      constraints: match[2],
      line: getLineNumber(code, match.index)
    });
  }

  return generics;
}

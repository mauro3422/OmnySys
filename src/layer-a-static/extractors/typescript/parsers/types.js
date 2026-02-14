/**
 * parsers/types.js
 * Extract type alias definitions from TypeScript code
 */

import { getLineNumber } from '../utils/line-utils.js';

// Pattern: type Name = ...
const TYPE_PATTERN = /type\s+(\w+)\s*(?:<[^>]+>)?\s*=\s*([^;]+);/g;

/**
 * Extract type aliases from TypeScript code
 * @param {string} code - Source code
 * @returns {Array} - Array of type definitions
 */
export function extractTypes(code) {
  const types = [];
  let match;

  while ((match = TYPE_PATTERN.exec(code)) !== null) {
    types.push({
      type: 'type_alias',
      name: match[1],
      definition: match[2].slice(0, 100),
      line: getLineNumber(code, match.index),
      hasGenerics: match[0].includes('<')
    });
  }

  return types;
}

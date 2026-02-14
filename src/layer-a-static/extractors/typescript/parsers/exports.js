/**
 * parsers/exports.js
 * Extract type exports from TypeScript code
 */

import { getLineNumber } from '../utils/line-utils.js';

// Pattern: export type, export interface
const TYPE_EXPORT_PATTERN = /export\s+(type|interface)\s+(\w+)/g;

/**
 * Extract type exports from TypeScript code
 * @param {string} code - Source code
 * @returns {Array} - Array of export definitions
 */
export function extractExports(code) {
  const exports = [];
  let match;

  while ((match = TYPE_EXPORT_PATTERN.exec(code)) !== null) {
    exports.push({
      type: match[1] === 'interface' ? 'interface_export' : 'type_export',
      name: match[2],
      line: getLineNumber(code, match.index)
    });
  }

  return exports;
}

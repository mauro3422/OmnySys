/**
 * parsers/enums.js
 * Extract enum definitions from TypeScript code
 */

import { getLineNumber } from '../utils/line-utils.js';

// Pattern: (export )?enum Name { ... }
const ENUM_PATTERN = /(?:export\s+)?enum\s+(\w+)\s*\{([^}]+)\}/g;

/**
 * Extract enums from TypeScript code
 * @param {string} code - Source code
 * @returns {Array} - Array of enum definitions
 */
export function extractEnums(code) {
  const enums = [];
  let match;

  while ((match = ENUM_PATTERN.exec(code)) !== null) {
    const values = match[2].split(',').map(v => v.trim()).filter(v => v);

    enums.push({
      type: 'enum',
      name: match[1],
      values: values.slice(0, 20),
      valueCount: values.length,
      line: getLineNumber(code, match.index)
    });
  }

  return enums;
}

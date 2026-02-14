/**
 * parsers/interfaces.js
 * Extract interface definitions from TypeScript code
 */

import { getLineNumber } from '../utils/line-utils.js';

// Pattern: interface Name extends Other { ... }
const INTERFACE_PATTERN = /interface\s+(\w+)\s*(?:extends\s+([^{]+))?\s*\{/g;

/**
 * Extract interfaces from TypeScript code
 * @param {string} code - Source code
 * @returns {Array} - Array of interface definitions
 */
export function extractInterfaces(code) {
  const interfaces = [];
  let match;

  while ((match = INTERFACE_PATTERN.exec(code)) !== null) {
    const extendsList = match[2] ? match[2].split(',').map(e => e.trim()) : [];

    interfaces.push({
      type: 'interface',
      name: match[1],
      extends: extendsList,
      line: getLineNumber(code, match.index),
      hasGenerics: match[0].includes('<')
    });
  }

  return interfaces;
}

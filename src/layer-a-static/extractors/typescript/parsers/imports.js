/**
 * parsers/imports.js
 * Extract type imports from TypeScript code
 */

import { getLineNumber } from '../utils/line-utils.js';

// Pattern: import type { X } from '...'
const TYPE_IMPORT_PATTERN = /import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;

/**
 * Extract type imports from TypeScript code
 * @param {string} code - Source code
 * @returns {Array} - Array of import definitions
 */
export function extractImports(code) {
  const imports = [];
  let match;

  while ((match = TYPE_IMPORT_PATTERN.exec(code)) !== null) {
    const types = match[1].split(',').map(t => t.trim());

    for (const typeName of types) {
      imports.push({
        type: 'type_import',
        name: typeName,
        source: match[2],
        line: getLineNumber(code, match.index)
      });
    }
  }

  return imports;
}

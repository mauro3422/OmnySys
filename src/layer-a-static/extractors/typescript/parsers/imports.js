/**
 * parsers/imports.js
 * Extract type imports from TypeScript code
 */

// Pattern: real import type statements at the beginning of a line.
const TYPE_IMPORT_PATTERN = /^\s*import\s+type\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gm;

function buildLineStarts(code) {
  const starts = [0];
  for (let i = 0; i < code.length; i++) {
    if (code.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  return starts;
}

function getLineFromIndex(lineStarts, index) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lineStarts[mid] <= index) {
      if (mid === lineStarts.length - 1 || lineStarts[mid + 1] > index) {
        return mid + 1;
      }
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return 1;
}

/**
 * Extract type imports from TypeScript code
 * @param {string} code - Source code
 * @returns {Array} - Array of import definitions
 */
export function extractTypeImports(code) {
  const imports = [];
  const source = typeof code === 'string' ? code : '';
  if (!source) {
    return imports;
  }

  TYPE_IMPORT_PATTERN.lastIndex = 0;
  const lineStarts = buildLineStarts(source);
  let match;

  while ((match = TYPE_IMPORT_PATTERN.exec(source)) !== null) {
    const types = match[1].split(',').map(t => t.trim());
    const line = getLineFromIndex(lineStarts, match.index);

    for (const typeName of types) {
      imports.push({
        type: 'type_import',
        name: typeName,
        source: match[2],
        line
      });
    }
  }

  return imports;
}





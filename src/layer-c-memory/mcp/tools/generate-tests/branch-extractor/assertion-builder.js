/**
 * @fileoverview Assertion Builder
 * Builds specific assertions from return expressions
 * 
 * @module mcp/tools/generate-tests/branch-extractor/assertion-builder
 */

import { usesImportedConstant } from './import-resolver.js';

/**
 * Builds specific assertion from return expression
 * 
 * @param {string} returnExpr - Return expression
 * @param {Array} neededImports - Needed imports
 * @returns {string} Assertion string
 */
export function buildAssertionFromExpr(returnExpr, neededImports = []) {
  if (!returnExpr) return 'expect(result).toBeDefined()';
  
  // Simple literals
  if (returnExpr === 'true')  return 'expect(result).toBe(true)';
  if (returnExpr === 'false') return 'expect(result).toBe(false)';
  if (returnExpr === 'null')  return 'expect(result).toBeNull()';
  if (/^\d+$/.test(returnExpr)) return `expect(result).toBe(${returnExpr})`;
  if (/^["']/.test(returnExpr)) return `expect(result).toBe(${returnExpr})`;
  
  // Imported constant: Priority.CRITICAL, ChangeType.DELETED
  if (usesImportedConstant(returnExpr)) {
    return `expect(result).toBe(${returnExpr})`;
  }
  
  // Passed parameter: options.priority → result is what we passed
  if (/^[\w.?]+$/.test(returnExpr) && returnExpr.includes('.')) {
    return 'expect(result).toBeDefined()';
  }
  
  // Empty array
  if (returnExpr === '[]') return 'expect(Array.isArray(result)).toBe(true)';
  
  // Object with known fields
  if (returnExpr.startsWith('{')) {
    const fields = [];
    const pairRegex = /(\w+)\s*:\s*(true|false|null|\d+|"[^"]{1,20}"|'[^']{1,20}')/g;
    let m;
    while ((m = pairRegex.exec(returnExpr)) !== null) {
      fields.push(`${m[1]}: ${m[2]}`);
    }
    if (fields.length > 0) {
      return `expect(result).toEqual(expect.objectContaining({ ${fields.join(', ')} }))`;
    }
    return 'expect(result).toEqual(expect.objectContaining({}))';
  }
  
  return 'expect(result).toBeDefined()';
}

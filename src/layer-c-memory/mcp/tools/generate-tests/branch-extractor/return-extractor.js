/**
 * @fileoverview Return Expression Extractor
 * Extracts return expressions from code lines
 * 
 * @module mcp/tools/generate-tests/branch-extractor/return-extractor
 */

/**
 * Extracts return expression from a line of code
 * @param {string} line - Code line
 * @returns {string|null} Return expression or null
 */
export function extractReturnExpr(line) {
  const m = line.match(/\breturn\s+(.+?)\s*;?\s*$/);
  return m ? m[1].trim() : null;
}

/**
 * Checks if line is a case statement with return
 * @param {string} line - Code line
 * @returns {{value: string, isDefault: boolean}|null}
 */
export function extractCaseReturn(line) {
  const trimmed = line.trim();
  
  // case X: return Y
  const sameCaseMatch = trimmed.match(/^case\s+(.+?)\s*:/);
  if (sameCaseMatch) {
    return { value: sameCaseMatch[1].trim(), isDefault: false };
  }
  
  // default:
  if (/^default\s*:/.test(trimmed)) {
    return { value: null, isDefault: true };
  }
  
  return null;
}

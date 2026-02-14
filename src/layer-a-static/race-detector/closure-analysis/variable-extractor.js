/**
 * @fileoverview Variable Extractor
 * 
 * Extracts variable declarations and references from code.
 * Pure functions with no side effects.
 * 
 * @module race-detector/closure-analysis/variable-extractor
 * @version 1.0.0
 */

import { isJavaScriptKeyword } from '../utils/index.js';

// Declaration patterns
const DECLARATION_PATTERNS = [
  { type: 'const', pattern: /\bconst\s+(\w+)/g },
  { type: 'let', pattern: /\blet\s+(\w+)/g },
  { type: 'var', pattern: /\bvar\s+(\w+)/g },
  { type: 'function', pattern: /\bfunction\s+(\w+)/g },
  { type: 'arrow', pattern: /\b(\w+)\s*=>/g }
];

/**
 * Extract variable declarations from code
 * @param {string} code - Source code
 * @returns {Array<string>} - Array of declared variable names
 */
export function extractDeclarations(code) {
  const declarations = [];
  
  for (const { pattern } of DECLARATION_PATTERNS) {
    let match;
    const localPattern = new RegExp(pattern.source, 'g');
    while ((match = localPattern.exec(code)) !== null) {
      declarations.push(match[1]);
    }
  }
  
  return [...new Set(declarations)];
}

/**
 * Extract variable references from code
 * @param {string} code - Source code
 * @returns {Array<string>} - Array of referenced variable names
 */
export function extractReferences(code) {
  const references = [];
  const pattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
  let match;
  
  while ((match = pattern.exec(code)) !== null) {
    const name = match[1];
    if (!isJavaScriptKeyword(name)) {
      references.push(name);
    }
  }
  
  return [...new Set(references)];
}

/**
 * Extract variables used in async callbacks
 * @param {string} code - Source code
 * @returns {Array<string>} - Array of variables
 */
export function extractAsyncCallbackVars(code) {
  const vars = [];
  
  // Look for variables used in .then(), .catch(), etc.
  const pattern = /\.(then|catch|finally)\s*\(\s*(?:\(?\s*(\w+)\s*\)?)?\s*=>\s*([^)]*)/g;
  let match;
  
  while ((match = pattern.exec(code)) !== null) {
    const body = match[3];
    vars.push(...extractReferences(body));
  }
  
  return vars;
}

/**
 * Extract closure scope information
 * @param {string} code - Source code
 * @returns {Object} - Scope information
 */
export function extractScopeInfo(code) {
  const declared = extractDeclarations(code);
  const referenced = extractReferences(code);
  const captured = referenced.filter(ref => !declared.includes(ref));
  
  return {
    declared,
    referenced,
    captured,
    captureCount: captured.length
  };
}

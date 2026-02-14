/**
 * @fileoverview Function Parser - Parseo de funciones
 * 
 * @module parsers/functions
 */

import { extractParams } from '../utils/param-extractor.js';

/**
 * Find all function declarations in code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of function info
 */
export function findFunctions(code) {
  const functions = [];
  
  // Function declarations: function name() {}
  const funcDeclPattern = /function\s+(\w+)\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{/g;
  let match;
  while ((match = funcDeclPattern.exec(code)) !== null) {
    functions.push({
      type: 'FunctionDeclaration',
      name: match[1],
      isAsync: false,
      isGenerator: false,
      start: match.index,
      params: extractParams(match[0])
    });
  }
  
  // Async function declarations
  const asyncFuncPattern = /async\s+function\s+(\w+)\s*\([^)]*\)/g;
  while ((match = asyncFuncPattern.exec(code)) !== null) {
    functions.push({
      type: 'FunctionDeclaration',
      name: match[1],
      isAsync: true,
      isGenerator: false,
      start: match.index,
      params: extractParams(match[0])
    });
  }
  
  return functions;
}

/**
 * Extract arrow functions from code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of arrow function info
 */
export function findArrowFunctions(code) {
  const arrows = [];
  
  // Const arrow: const x = () =>
  const constArrowPattern = /const\s+(\w+)\s*=\s*(async\s*)?\([^)]*\)\s*=>/g;
  let match;
  while ((match = constArrowPattern.exec(code)) !== null) {
    arrows.push({
      type: 'ArrowFunction',
      name: match[1],
      isAsync: !!match[2],
      assignment: 'const',
      start: match.index
    });
  }
  
  // Let arrow: let x = () =>
  const letArrowPattern = /let\s+(\w+)\s*=\s*(async\s*)?\([^)]*\)\s*=>/g;
  while ((match = letArrowPattern.exec(code)) !== null) {
    arrows.push({
      type: 'ArrowFunction',
      name: match[1],
      isAsync: !!match[2],
      assignment: 'let',
      start: match.index
    });
  }
  
  return arrows;
}

/**
 * Find all function expressions
 * @param {string} code - Source code
 * @returns {Array} Function expressions
 */
export function findFunctionExpressions(code) {
  const functions = [];
  
  // Function expressions: const x = function() {}
  const exprPattern = /(?:const|let|var)\s+(\w+)\s*=\s*(async\s*)?function\s*\(/g;
  let match;
  while ((match = exprPattern.exec(code)) !== null) {
    functions.push({
      type: 'FunctionExpression',
      name: match[1],
      isAsync: !!match[2],
      start: match.index
    });
  }
  
  return functions;
}

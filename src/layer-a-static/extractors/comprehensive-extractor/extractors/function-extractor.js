/**
 * @fileoverview function-extractor.js
 * 
 * Function Extractor - Extracts all function-related constructs
 * Handles function declarations, expressions, and arrow functions
 * 
 * @module comprehensive-extractor/extractors/function-extractor
 * @phase Layer A - Enhanced
 */

import {
  findFunctions,
  findArrowFunctions,
  findMethods
} from '../parsers/ast-parser.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:function-extractor');

/**
 * Extract all functions from code
 * 
 * @param {string} code - Source code
 * @param {Object} options - Extraction options
 * @returns {Object} - Function extraction results
 */
export function extractFunctions(code, options = {}) {
  try {
    const functions = findFunctions(code);
    const arrows = findArrowFunctions(code);
    
    // Extract detailed info for each function
    const detailedFunctions = functions.map(func => ({
      ...func,
      complexity: estimateComplexity(code, func),
      hasJSDoc: hasJSDoc(code, func.start),
      returnType: inferReturnType(code, func)
    }));
    
    const detailedArrows = arrows.map(arrow => ({
      ...arrow,
      complexity: estimateComplexity(code, arrow),
      hasJSDoc: hasJSDoc(code, arrow.start),
      returnType: inferReturnType(code, arrow)
    }));
    
    return {
      functions: detailedFunctions,
      arrowFunctions: detailedArrows,
      totalCount: functions.length + arrows.length,
      asyncCount: [...functions, ...arrows].filter(f => f.isAsync).length,
      hasGenerators: functions.some(f => f.isGenerator),
      _metadata: {
        extractedAt: new Date().toISOString(),
        success: true
      }
    };
  } catch (error) {
    logger.warn(`Error extracting functions: ${error.message}`);
    return {
      functions: [],
      arrowFunctions: [],
      totalCount: 0,
      asyncCount: 0,
      _metadata: { error: error.message, success: false }
    };
  }
}

/**
 * Extract function calls from code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of function calls
 */
export function extractFunctionCalls(code) {
  const calls = [];
  
  // Function calls: name() or obj.method()
  const callPattern = /(\w+(?:\.\w+)*|this\.\w+)\s*\(/g;
  let match;
  
  while ((match = callPattern.exec(code)) !== null) {
    const name = match[1];
    
    // Skip keywords and common patterns
    if (['if', 'while', 'for', 'switch', 'catch'].includes(name)) continue;
    
    calls.push({
      name,
      isMethod: name.includes('.'),
      isThis: name.startsWith('this.'),
      start: match.index
    });
  }
  
  return [...new Map(calls.map(c => [c.name, c])).values()];
}

/**
 * Extract recursive functions
 * 
 * @param {string} code - Source code
 * @param {Array} functions - Already extracted functions
 * @returns {Array} - Functions that call themselves
 */
export function extractRecursiveFunctions(code, functions = []) {
  return functions.filter(func => {
    const funcBody = extractFunctionBody(code, func);
    return funcBody && funcBody.includes(func.name);
  });
}

/**
 * Extract higher-order functions (functions that return or take functions)
 * 
 * @param {string} code - Source code
 * @returns {Array} - Higher-order function info
 */
export function extractHigherOrderFunctions(code) {
  const hofs = [];
  
  // Functions returning functions: function x() { return function() {} }
  const returnFuncPattern = /function\s+(\w+)[^{]*\{[^}]*return\s+(?:async\s*)?(?:function|[^=]+=>)/g;
  let match;
  while ((match = returnFuncPattern.exec(code)) !== null) {
    hofs.push({
      name: match[1],
      type: 'returnsFunction',
      start: match.index
    });
  }
  
  // Functions taking callback parameters
  const callbackPattern = /function\s+(\w+)\s*\([^)]*\bcallback\b[^)]*\)/gi;
  while ((match = callbackPattern.exec(code)) !== null) {
    hofs.push({
      name: match[1],
      type: 'takesCallback',
      start: match.index
    });
  }
  
  return hofs;
}

/**
 * Extract async patterns in functions
 * 
 * @param {string} code - Source code
 * @returns {Object} - Async pattern analysis
 */
export function extractAsyncPatterns(code) {
  return {
    hasAsyncAwait: /async\s+function|\basync\s*\(/.test(code),
    hasPromises: /\.then\(|\.catch\(|new\s+Promise/.test(code),
    hasPromiseAll: /Promise\.(all|allSettled|race|any)\s*\(/.test(code),
    asyncFunctionCount: (code.match(/async\s+function/g) || []).length,
    awaitCount: (code.match(/\bawait\b/g) || []).length,
    promiseChains: (code.match(/\.then\(/g) || []).length
  };
}

/**
 * Estimate cyclomatic complexity of a function
 * 
 * @param {string} code - Full source code
 * @param {Object} func - Function info
 * @returns {number} - Complexity score
 */
function estimateComplexity(code, func) {
  const funcBody = extractFunctionBody(code, func);
  if (!funcBody) return 1;
  
  let complexity = 1;
  
  // Count decision points
  complexity += (funcBody.match(/\bif\b/g) || []).length;
  complexity += (funcBody.match(/\belse\s+if\b/g) || []).length;
  complexity += (funcBody.match(/\bcase\b/g) || []).length;
  complexity += (funcBody.match(/\bfor\b/g) || []).length;
  complexity += (funcBody.match(/\bwhile\b/g) || []).length;
  complexity += (funcBody.match(/\bcatch\b/g) || []).length;
  complexity += (funcBody.match(/\?\s*[^:]+\s*:/g) || []).length; // ternary
  complexity += (funcBody.match(/\|\|/g) || []).length; // logical OR
  complexity += (funcBody.match(/&&/g) || []).length; // logical AND
  
  return complexity;
}

/**
 * Check if function has JSDoc
 * 
 * @param {string} code - Source code
 * @param {number} startPos - Function start position
 * @returns {boolean}
 */
function hasJSDoc(code, startPos) {
  const beforeFunc = code.slice(Math.max(0, startPos - 500), startPos);
  return /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeFunc);
}

/**
 * Infer return type from function
 * 
 * @param {string} code - Source code
 * @param {Object} func - Function info
 * @returns {string|null}
 */
function inferReturnType(code, func) {
  // Check for explicit type annotation
  const funcSignature = code.slice(func.start, func.start + 200);
  const typeMatch = funcSignature.match(/\)\s*:\s*([^{]+)/);
  if (typeMatch) return typeMatch[1].trim();
  
  // Check for TypeScript explicit return type
  const tsMatch = funcSignature.match(/\)\s*:\s*(?:Promise<)?(\w+)/);
  if (tsMatch) return tsMatch[1];
  
  return null;
}

/**
 * Extract function body from code
 * 
 * @param {string} code - Source code
 * @param {Object} func - Function info
 * @returns {string|null}
 */
function extractFunctionBody(code, func) {
  // Find the opening brace
  const startIdx = code.indexOf('{', func.start);
  if (startIdx === -1) return null;
  
  // Simple brace counting for body extraction
  let braceCount = 1;
  let endIdx = startIdx + 1;
  
  while (braceCount > 0 && endIdx < code.length) {
    if (code[endIdx] === '{') braceCount++;
    if (code[endIdx] === '}') braceCount--;
    endIdx++;
  }
  
  return code.slice(startIdx, endIdx);
}

// ============================================
// EXPORTS
// ============================================

export default {
  extractFunctions,
  extractFunctionCalls,
  extractRecursiveFunctions,
  extractHigherOrderFunctions,
  extractAsyncPatterns
};

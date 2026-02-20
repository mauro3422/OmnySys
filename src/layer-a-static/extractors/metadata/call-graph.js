/**
 * @fileoverview call-graph.js
 *
 * Call Graph Extractor - Maps function definitions and calls
 * Part of the metadata extraction pipeline
 *
 * @module extractors/metadata/call-graph
 */

import { getLineNumber } from '../utils.js';

/**
 * Extracts call graph information from code
 * @param {string} code - Source code to analyze
 * @returns {Object} Function definitions and calls
 */
export function extractCallGraph(code) {
  const functionDefinitions = [];
  const internalCalls = [];
  const externalCalls = [];

  // Extract function definitions
  const functionPatterns = [
    // export function name(
    { pattern: /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g, isExported: true },
    // function name(
    { pattern: /(?:^|\s)function\s+(\w+)\s*\(([^)]*)\)/g, isExported: false },
    // const name = function(
    { pattern: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/g, isExported: false },
    // const name = (
    { pattern: /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g, isExported: false },
    // export const name = (
    { pattern: /export\s+(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:function\s*)?\(([^)]*)\)/g, isExported: true }
  ];

  for (const { pattern, isExported } of functionPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const name = match[1];
      const params = match[2] ? match[2].split(',').map(p => p.trim()).filter(Boolean) : [];
      const isAsync = match[0].includes('async');

      functionDefinitions.push({
        name,
        line: getLineNumber(code, match.index),
        params,
        isAsync,
        isExported
      });
    }
  }

  // Extract function names for internal call detection
  const definedFunctions = new Set(functionDefinitions.map(f => f.name));

  // Extract imports to identify external calls
  const importedSymbols = new Set();
  const importPattern = /import\s+(?:\*\s+as\s+(\w+)|{([^}]+)}|\s*(\w+))\s+from\s+['"]/g;
  let importMatch;
  while ((importMatch = importPattern.exec(code)) !== null) {
    if (importMatch[1]) {
      // import * as name
      importedSymbols.add(importMatch[1]);
    } else if (importMatch[2]) {
      // import { a, b, c }
      const names = importMatch[2].split(',').map(n => n.trim().split(/\s+as\s+/).pop());
      names.forEach(n => importedSymbols.add(n));
    } else if (importMatch[3]) {
      // import name
      importedSymbols.add(importMatch[3]);
    }
  }

  // Extract function calls (v0.9.34 - improved detection)
  // Pattern 1: simple call - functionName(
  const simpleCallPattern = /(\w+)\s*\(/g;
  let callMatch;
  while ((callMatch = simpleCallPattern.exec(code)) !== null) {
    const callee = callMatch[1];
    const line = getLineNumber(code, callMatch.index);

    // Skip common keywords and builtins
    if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 
         'console', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
         'Promise', 'Map', 'Set', 'Date', 'Math', 'Error', 'setTimeout', 
         'setInterval', 'clearTimeout', 'clearInterval', 'fetch', 'require'].includes(callee)) {
      continue;
    }

    if (definedFunctions.has(callee)) {
      internalCalls.push({ callee, line, type: 'internal' });
    } else if (importedSymbols.has(callee)) {
      externalCalls.push({ callee, line, type: 'external' });
    }
  }

  // Pattern 2: member call - this.method( or obj.method(
  const memberCallPattern = /(?:this|(\w+))\.(\w+)\s*\(/g;
  let memberMatch;
  while ((memberMatch = memberCallPattern.exec(code)) !== null) {
    const objName = memberMatch[1] || 'this';
    const methodName = memberMatch[2];
    const line = getLineNumber(code, memberMatch.index);
    const fullName = `${objName}.${methodName}`;

    // Skip known builtins
    const builtinMethods = ['log', 'info', 'warn', 'error', 'debug', 'trace',
      'push', 'pop', 'shift', 'unshift', 'splice', 'slice', 'map', 'filter', 
      'find', 'reduce', 'forEach', 'some', 'every', 'includes', 'indexOf',
      'join', 'split', 'trim', 'toLowerCase', 'toUpperCase', 'replace',
      'match', 'test', 'toString', 'valueOf', 'hasOwnProperty', 'keys', 
      'values', 'entries', 'assign', 'freeze', 'seal', 'parse', 'stringify',
      'then', 'catch', 'finally', 'resolve', 'reject', 'all', 'race',
      'addEventListener', 'removeEventListener', 'appendChild', 'removeChild'];
    
    if (builtinMethods.includes(methodName)) {
      continue;
    }

    // Check if it's a call to an imported object's method
    if (importedSymbols.has(objName)) {
      externalCalls.push({ callee: fullName, name: methodName, object: objName, line, type: 'external' });
    } else {
      // Assume internal (this.method or local object)
      internalCalls.push({ callee: fullName, name: methodName, object: objName, line, type: 'internal' });
    }
  }

  // Pattern 3: constructor calls - new ClassName(
  const constructorPattern = /new\s+(\w+)\s*\(/g;
  let constructorMatch;
  while ((constructorMatch = constructorPattern.exec(code)) !== null) {
    const className = constructorMatch[1];
    const line = getLineNumber(code, constructorMatch.index);
    
    // Skip builtins
    if (['Promise', 'Map', 'Set', 'Date', 'Error', 'TypeError', 'ReferenceError',
         'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp'].includes(className)) {
      continue;
    }
    
    if (importedSymbols.has(className)) {
      externalCalls.push({ callee: className, line, type: 'constructor', isExternal: true });
    } else {
      internalCalls.push({ callee: className, line, type: 'constructor' });
    }
  }

  // Combine all
  const all = [
    ...functionDefinitions.map(f => ({ ...f, category: 'definition' })),
    ...internalCalls.map(c => ({ ...c, category: 'internal_call' })),
    ...externalCalls.map(c => ({ ...c, category: 'external_call' }))
  ];

  return {
    functionDefinitions,
    internalCalls,
    externalCalls,
    all
  };
}

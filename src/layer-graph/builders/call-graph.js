/**
 * @fileoverview call-graph.js
 *
 * Call Graph Extractor - Maps function definitions and calls
 * Part of the layer-graph builders
 *
 * @module layer-graph/builders/call-graph
 */

/**
 * Gets line number from character index
 * @param {string} code - Source code
 * @param {number} index - Character index
 * @returns {number} Line number (1-based)
 */
function getLineNumber(code, index) {
  const lines = code.substring(0, index).split('\n');
  return lines.length;
}

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

  // Extract function calls
  const callPattern = /(\w+)\s*\(/g;
  let callMatch;
  while ((callMatch = callPattern.exec(code)) !== null) {
    const callee = callMatch[1];
    const line = getLineNumber(code, callMatch.index);

    // Skip common keywords
    if (['if', 'for', 'while', 'switch', 'catch', 'function', 'return'].includes(callee)) {
      continue;
    }

    if (definedFunctions.has(callee)) {
      // Internal call
      internalCalls.push({
        callee,
        line,
        type: 'internal'
      });
    } else if (importedSymbols.has(callee)) {
      // External call
      externalCalls.push({
        callee,
        line,
        type: 'external'
      });
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

/**
 * @fileoverview async-patterns.js
 * 
 * Extrae patrones de async/await y Promise
 * 
 * @module extractors/metadata/async-patterns
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae patrones de async/await y Promise
 * @param {string} code - Código fuente
 * @returns {Object} - { asyncFunctions: [], promiseChains: [], raceConditions: [] }
 */
export function extractAsyncPatterns(code) {
  const patterns = {
    asyncFunctions: [],     // async function, async arrow
    promiseCreations: [],   // new Promise()
    promiseChains: [],      // .then().catch()
    promiseAll: [],         // Promise.all([...])
    promiseRace: [],        // Promise.race([...])
    awaitExpressions: [],   // await x
    timeouts: [],           // setTimeout, setInterval
    raceConditions: [],     // Patrones sospechosos
    all: []
  };
  
  // async function declarations
  const asyncFuncPattern = /async\s+(?:function\s+)?(\w+)?\s*[\(=>]/g;
  
  // new Promise((resolve, reject) => ...)
  const newPromisePattern = /new\s+Promise\s*\(\s*(?:async\s*)?\(\s*(\w+)\s*,\s*(\w+)\s*\)/g;
  
  // Promise.all() / Promise.allSettled()
  const promiseAllPattern = /Promise\.(all|allSettled|race|any)\s*\(\s*(\[)/g;
  
  // await expressions
  const awaitPattern = /await\s+([^;\n]+)/g;
  
  // .then().catch().finally() chains
  const promiseChainPattern = /(\w+)\.(then|catch|finally)\s*\(/g;
  
  // setTimeout / setInterval
  const timeoutPattern = /(setTimeout|setInterval)\s*\(\s*([^,]+)\s*,\s*(\d+)/g;
  
  // Patrones de race condition sospechosos
  // await en loop: for (...) { await ... }
  const awaitInLoopPattern = /(for|while)\s*\([^)]+\)\s*\{[^}]*await\s+/g;
  
  let match;
  
  while ((match = asyncFuncPattern.exec(code)) !== null) {
    patterns.asyncFunctions.push({
      type: 'async_function',
      name: match[1] || 'anonymous',
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = newPromisePattern.exec(code)) !== null) {
    patterns.promiseCreations.push({
      type: 'new_promise',
      resolveParam: match[1],
      rejectParam: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = promiseAllPattern.exec(code)) !== null) {
    const method = match[1];
    if (method === 'race') {
      patterns.promiseRace.push({
        type: 'promise_race',
        line: getLineNumber(code, match.index)
      });
    } else {
      patterns.promiseAll.push({
        type: `promise_${method}`,
        line: getLineNumber(code, match.index)
      });
    }
  }
  
  while ((match = awaitPattern.exec(code)) !== null) {
    patterns.awaitExpressions.push({
      type: 'await',
      expression: match[1].trim(),
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = promiseChainPattern.exec(code)) !== null) {
    patterns.promiseChains.push({
      type: 'promise_chain',
      target: match[1],
      method: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = timeoutPattern.exec(code)) !== null) {
    patterns.timeouts.push({
      type: match[1],
      delay: parseInt(match[3]),
      line: getLineNumber(code, match.index)
    });
  }
  
  // Detectar await en loops (patrón sospechoso)
  const loopMatch = awaitInLoopPattern.exec(code);
  if (loopMatch) {
    patterns.raceConditions.push({
      type: 'await_in_loop',
      description: 'Sequential await in loop may cause performance issues',
      line: getLineNumber(code, loopMatch.index),
      severity: 'WARNING'
    });
  }
  
  patterns.all = [
    ...patterns.asyncFunctions,
    ...patterns.promiseCreations,
    ...patterns.promiseAll,
    ...patterns.promiseRace,
    ...patterns.awaitExpressions,
    ...patterns.promiseChains,
    ...patterns.timeouts
  ];
  
  return patterns;
}

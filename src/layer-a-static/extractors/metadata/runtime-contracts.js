/**
 * @fileoverview runtime-contracts.js
 * 
 * Extrae aserciones y validaciones de runtime
 * 
 * @module extractors/metadata/runtime-contracts
 */

import { getLineNumber } from '../utils.js';

/**
 * Extrae aserciones y validaciones de runtime
 * @param {string} code - Código fuente
 * @returns {Object} - { assertions: [], invariants: [], validations: [] }
 */
export function extractRuntimeContracts(code) {
  const contracts = {
    assertions: [],    // console.assert, assert()
    invariants: [],    // if (x === null) throw
    validations: [],   // typeof checks, instanceof
    nullChecks: [],    // if (!x) return
    all: []
  };
  
  // console.assert() o assert()
  const assertPattern = /(?:console\.)?assert\s*\(\s*([^,]+)(?:,\s*([^)]+))?\)/g;
  
  // typeof checks
  const typeofPattern = /typeof\s+(\w+)\s*===?\s*['"]([^'"]+)['"]/g;
  
  // instanceof checks
  const instanceofPattern = /(\w+)\s+instanceof\s+(\w+)/g;
  
  // if (x === null || x === undefined) throw
  const nullGuardPattern = /if\s*\(\s*(\w+)\s*===?\s*(?:null|undefined)\s*\)\s*\{\s*throw\s+new\s+(\w+)/g;
  
  // if (!x) return early
  const earlyReturnPattern = /if\s*\(\s*!(\w+)\s*\)\s*(?:return|throw)/g;
  
  let match;
  
  while ((match = assertPattern.exec(code)) !== null) {
    contracts.assertions.push({
      type: 'assert',
      condition: match[1],
      message: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = typeofPattern.exec(code)) !== null) {
    contracts.validations.push({
      type: 'typeof',
      variable: match[1],
      expectedType: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = instanceofPattern.exec(code)) !== null) {
    contracts.validations.push({
      type: 'instanceof',
      variable: match[1],
      expectedClass: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = nullGuardPattern.exec(code)) !== null) {
    contracts.nullChecks.push({
      type: 'null_guard',
      variable: match[1],
      throws: match[2],
      line: getLineNumber(code, match.index)
    });
  }
  
  while ((match = earlyReturnPattern.exec(code)) !== null) {
    contracts.invariants.push({
      type: 'early_return',
      variable: match[1],
      line: getLineNumber(code, match.index)
    });
  }
  
  contracts.all = [
    ...contracts.assertions,
    ...contracts.validations,
    ...contracts.nullChecks,
    ...contracts.invariants
  ];
  
  return contracts;
}

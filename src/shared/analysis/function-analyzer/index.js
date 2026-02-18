/**
 * @fileoverview Function Analyzer - Main Entry Point (Refactored)
 * 
 * Análisis granular por función
 * 
 * @module function-analyzer
 */

import { extractFunctionCode, extractFunctionSignature } from './extractors/code-extractor.js';
import { detectUsedImports } from './detectors/import-usage-detector.js';
import { detectGlobalAccess } from './detectors/global-access-detector.js';
import { detectLocalStorageOps } from './detectors/localStorage-detector.js';
import { detectEventOps } from './detectors/event-detector.js';

/**
 * Analyze functions in a file
 * @param {string} filePath - File path
 * @param {string} code - Source code
 * @param {Object} fileAnalysis - File analysis from Layer A
 * @returns {Array} Function analyses
 */
export function analyzeFunctions(filePath, code, fileAnalysis) {
  const functions = [];
  const functionDefs = fileAnalysis.definitions?.filter(d => d.type === 'function') || [];

  for (const funcDef of functionDefs) {
    const functionCode = extractFunctionCode(code, funcDef);
    const signature = extractFunctionSignature(functionCode);

    const functionContext = {
      name: funcDef.name || signature.name,
      params: funcDef.params || signature.params,
      line: funcDef.line,
      endLine: funcDef.endLine,
      isExported: funcDef.isExported,
      isAsync: functionCode.includes('async '),
      usedImports: detectUsedImports(functionCode, fileAnalysis.imports),
      globalAccess: detectGlobalAccess(functionCode),
      localStorageOps: detectLocalStorageOps(functionCode),
      eventOps: detectEventOps(functionCode)
    };

    functions.push(functionContext);
  }

  return functions;
}

/**
 * Analyze single function
 * @param {string} code - Source code
 * @param {Object} funcDef - Function definition
 * @param {Array} imports - File imports
 * @returns {Object} Function analysis
 */
export function analyzeSingleFunction(code, funcDef, imports = []) {
  const functionCode = extractFunctionCode(code, funcDef);
  const signature = extractFunctionSignature(functionCode);

  return {
    name: funcDef.name || signature.name,
    params: funcDef.params || signature.params,
    line: funcDef.line,
    endLine: funcDef.endLine,
    isExported: funcDef.isExported,
    isAsync: functionCode.includes('async '),
    usedImports: detectUsedImports(functionCode, imports),
    globalAccess: detectGlobalAccess(functionCode),
    localStorageOps: detectLocalStorageOps(functionCode),
    eventOps: detectEventOps(functionCode),
    code: functionCode
  };
}

/**
 * Check if a function has side effects
 * @param {Object} funcAnalysis - Function analysis result
 * @returns {boolean} True if function has side effects
 */
export function hasSideEffects(funcAnalysis) {
  if (!funcAnalysis) return false;
  
  if (funcAnalysis.localStorageOps?.length > 0) {
    return true;
  }
  
  if (funcAnalysis.globalAccess?.some(g => g.isWrite)) {
    return true;
  }
  
  if (funcAnalysis.eventOps?.length > 0) {
    return true;
  }
  
  return false;
}

/**
 * Check if a function is pure (no side effects)
 * @param {Object} funcAnalysis - Function analysis result
 * @returns {boolean} True if function is pure
 */
export function isPureFunction(funcAnalysis) {
  return !hasSideEffects(funcAnalysis);
}

// Re-export all
export * from './extractors/code-extractor.js';
export * from './detectors/import-usage-detector.js';
export * from './detectors/global-access-detector.js';
export * from './detectors/localStorage-detector.js';
export * from './detectors/event-detector.js';

// Default export
export default {
  analyzeFunctions,
  analyzeSingleFunction
};

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
      usedImports: detectUsedImports(functionCode, fileAnalysis.imports),
      globalAccess: detectGlobalAccess(functionCode)
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
    usedImports: detectUsedImports(functionCode, imports),
    globalAccess: detectGlobalAccess(functionCode),
    code: functionCode
  };
}

// Re-export all
export * from './extractors/code-extractor.js';
export * from './detectors/import-usage-detector.js';
export * from './detectors/global-access-detector.js';

// Default export
export default {
  analyzeFunctions,
  analyzeSingleFunction
};

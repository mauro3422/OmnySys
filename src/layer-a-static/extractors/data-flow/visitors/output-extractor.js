/**
 * @fileoverview Output Extractor (Legacy Compatibility)
 * 
 * Este archivo mantiene compatibilidad hacia atrás.
 * Nuevo código debe importar desde './output-extractor/index.js'
 * 
 * @deprecated Use './output-extractor/index.js' instead
 * @module data-flow/output-extractor-legacy
 * @version 2.0.0
 */

// Re-export everything from new modular structure
export {
  OutputExtractor,
  extractReturn,
  extractImplicitReturn,
  createUndefinedReturn,
  extractThrow,
  extractSideEffect,
  extractSources,
  inferShape,
  extractProperties,
  getMemberPath,
  getCalleeName,
  getIdentifierName,
  getAssignmentTarget,
  nodeToString,
  findFunctionNode,
  isSideEffectCall,
  classifySideEffect,
  processStatements,
  processStatement
} from './output-extractor/index.js';

// Default export for compatibility
export { OutputExtractor as default } from './output-extractor/OutputExtractor.js';

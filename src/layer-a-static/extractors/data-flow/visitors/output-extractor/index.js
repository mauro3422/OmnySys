/**
 * @fileoverview Output Extractor Module
 * 
 * Sistema modular de extracción de outputs de funciones.
 * 
 * @module data-flow/output-extractor
 * @version 2.0.0
 */

// Main class
export { OutputExtractor } from './OutputExtractor.js';

// Extractors
export { 
  extractReturn, 
  extractImplicitReturn, 
  createUndefinedReturn 
} from './extractors/return-extractor.js';

export { extractThrow } from './extractors/throw-extractor.js';
export { extractSideEffect } from './extractors/side-effect-extractor.js';
export { extractSources } from './extractors/source-extractor.js';
export { inferShape, extractProperties } from './extractors/shape-inferer.js';

// Helpers
export {
  getMemberPath,
  getCalleeName,
  getIdentifierName,
  getAssignmentTarget,
  nodeToString,
  findFunctionNode
} from './helpers/ast-helpers.js';

// Classifiers
export { 
  isSideEffectCall, 
  classifySideEffect 
} from './classifiers/side-effect-classifier.js';

// Processors
export { 
  processStatements, 
  processStatement 
} from './processors/statement-processor.js';

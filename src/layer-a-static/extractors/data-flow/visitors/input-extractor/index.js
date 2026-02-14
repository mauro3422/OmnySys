/**
 * @fileoverview Input Extractor Module
 * 
 * Sistema modular de extracción de inputs de funciones.
 * 
 * @module data-flow/input-extractor
 * @version 2.0.0
 */

// Main class
export { InputExtractor } from './InputExtractor.js';

// Extractors
export {
  extractParameters,
  parseParameter,
  parseDestructuring
} from './extractors/param-extractor.js';

export { extractDefaultValue } from './extractors/default-value-extractor.js';

// Analyzers
export { findUsages } from './analyzers/usage-analyzer.js';

// Helpers
export {
  findFunctionNode,
  getIdentifierName
} from './helpers/ast-helpers.js';

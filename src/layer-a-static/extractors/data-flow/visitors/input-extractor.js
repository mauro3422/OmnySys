/**
 * @fileoverview Input Extractor (Legacy Compatibility)
 * 
 * Este archivo mantiene compatibilidad hacia atrás.
 * Nuevo código debe importar desde './input-extractor/index.js'
 * 
 * @deprecated Use './input-extractor/index.js' instead
 * @module data-flow/input-extractor-legacy
 * @version 2.0.0
 */

export {
  InputExtractor,
  extractParameters,
  parseParameter,
  parseDestructuring,
  extractDefaultValue,
  findUsages,
  findFunctionNode,
  getIdentifierName
} from './input-extractor/index.js';

export { InputExtractor as default } from './input-extractor/InputExtractor.js';

/**
 * @fileoverview definitions.js
 * 
 * Extrae definiciones (funciones, clases, variables)
 * V2: Soporte completo para todos los tipos de funciones
 * 
 * ⚠️ DEPRECATED: This file is kept for backward compatibility.
 * Please import directly from the definitions/ directory:
 *   import { extractFunctionDefinition, extractClassDefinition } from './definitions/index.js';
 * 
 * @module parser/extractors/definitions
 * @deprecated Use definitions/ directory modules instead
 */

export {
  extractFunctionDefinition,
  extractArrowFunction,
  extractFunctionExpression,
  extractClassDefinition,
  extractVariableExports,
  extractTestCallback
} from './definitions/index.js';

export { default } from './definitions/index.js';

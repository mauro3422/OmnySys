/**
 * @fileoverview Definitions Extractors - Index
 * 
 * Barrel export para todos los extractores de definiciones.
 * 
 * @module parser/extractors/definitions
 */

import { extractFunctionDefinition, extractArrowFunction, extractFunctionExpression } from './function-extractors.js';
import { extractClassDefinition } from './class-extractor.js';
import { extractVariableExports } from './variable-extractor.js';
import { extractTestCallback } from './test-extractor.js';

export {
  extractFunctionDefinition,
  extractArrowFunction,
  extractFunctionExpression,
  extractClassDefinition,
  extractVariableExports,
  extractTestCallback
};

export default {
  extractFunctionDefinition,
  extractArrowFunction,
  extractFunctionExpression,
  extractClassDefinition,
  extractVariableExports,
  extractTestCallback
};

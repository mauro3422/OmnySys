/**
 * @fileoverview Operation Classifier
 * 
 * Clasifica operaciones AST en tipos de transformación.
 * Centraliza la lógica de clasificación de operaciones mediante composición pura.
 * 
 * @module transformation-extractor/core/operation-classifier
 * @version 2.0.0
 */

import { OPERATION_TYPES, getOperationTypes } from './operation-types.js';
import { classifyAwait } from './classifiers/await.js';
import { classifyCall, classifyNew } from './classifiers/calls.js';
import { classifyBinary, classifyUnary, classifyUpdate, classifyMember, classifyConditional } from './classifiers/expressions.js';
import { classifyArray, classifyObject, classifySpread, classifyTemplate } from './classifiers/literals.js';

export { OPERATION_TYPES, getOperationTypes };

/**
 * Clasifica el tipo de operación de un nodo AST (Tree-sitter)
 * @param {Object} node - Nodo Tree-sitter
 * @param {string} code - Código fuente
 * @returns {Object} - Clasificación de la operación
 */
export function classifyOperation(node, code) {
  if (!node) {
    return { type: OPERATION_TYPES.ASSIGNMENT, via: null, details: {} };
  }

  // DI binding para prevenir Import Loop ESM
  const boundClassifyAwait = (n, c) => classifyAwait(n, c, classifyOperation);

  const classifiers = [
    boundClassifyAwait,
    classifyCall,
    classifyBinary,
    classifyUnary,
    classifyUpdate,
    classifyMember,
    classifyConditional,
    classifyArray,
    classifyObject,
    classifySpread,
    classifyTemplate,
    classifyNew
  ];

  for (const classifier of classifiers) {
    const result = classifier(node, code);
    if (result) return result;
  }

  // Default
  return {
    type: OPERATION_TYPES.ASSIGNMENT,
    via: null,
    details: { nodeType: node.type }
  };
}

/**
 * @fileoverview Return Extractor
 * 
 * Extrae información de return statements.
 * 
 * @module data-flow/output-extractor/extractors/return-extractor
 * @version 1.0.0
 */

import { extractSources } from './source-extractor.js';
import { inferShape, extractProperties } from './shape-inferer.js';
import { nodeToString } from '../helpers/ast-helpers.js';

/**
 * Extrae información de un return statement
 * @param {Object} returnStmt - Nodo ReturnStatement
 * @returns {Object}
 */
export function extractReturn(returnStmt) {
  const arg = returnStmt.argument;
  
  // return; (undefined implícito)
  if (!arg) {
    return {
      type: 'return',
      value: 'undefined',
      shape: 'undefined',
      line: returnStmt.loc?.start?.line
    };
  }

  const sources = extractSources(arg);
  const shape = inferShape(arg);

  return {
    type: 'return',
    value: nodeToString(arg),
    shape: shape,
    sources: sources,
    properties: extractProperties(arg),
    line: returnStmt.loc?.start?.line
  };
}

/**
 * Extrae return implícito de arrow function
 * @param {Object} expr - Nodo de expresión
 * @returns {Object}
 */
export function extractImplicitReturn(expr) {
  const sources = extractSources(expr);
  const shape = inferShape(expr);

  return {
    type: 'return',
    value: nodeToString(expr),
    shape: shape,
    sources: sources,
    properties: extractProperties(expr),
    implicit: true,
    line: expr.loc?.start?.line
  };
}

/**
 * Crea output para función sin return explícito
 * @param {number} line - Línea donde termina la función
 * @returns {Object}
 */
export function createUndefinedReturn(line) {
  return {
    type: 'return',
    value: 'undefined',
    shape: 'undefined',
    implicit: true,
    line: line
  };
}

export default { extractReturn, extractImplicitReturn, createUndefinedReturn };

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
import { startLine, text } from '../../../utils/ts-ast-utils.js';

function nodeToString(node, code) {
  if (!node) return 'undefined';
  return text(node, code);
}

export function extractReturn(returnStmt, code) {
  const arg = returnStmt.childForFieldName('argument');

  // return; (undefined implícito)
  if (!arg) {
    return {
      type: 'return',
      value: 'undefined',
      shape: 'undefined',
      line: startLine(returnStmt)
    };
  }

  const sources = extractSources(arg, code);
  const shape = inferShape(arg, code);

  return {
    type: 'return',
    value: nodeToString(arg, code),
    shape: shape,
    sources: sources,
    properties: extractProperties(arg, code),
    line: startLine(returnStmt)
  };
}

export function extractImplicitReturn(expr, code) {
  const sources = extractSources(expr, code);
  const shape = inferShape(expr, code);

  return {
    type: 'return',
    value: nodeToString(expr, code),
    shape: shape,
    sources: sources,
    properties: extractProperties(expr, code),
    implicit: true,
    line: startLine(expr)
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

/**
 * @fileoverview Throw Extractor
 * 
 * Extrae información de throw statements.
 * 
 * @module data-flow/output-extractor/extractors/throw-extractor
 * @version 1.0.0
 */

import { startLine, text, getMemberPath } from '../../../utils/ts-ast-utils.js';

function getCalleeName(node, code) {
  if (!node) return '<anonymous>';
  return getMemberPath(node, code) || text(node, code) || '<anonymous>';
}

/**
 * Extrae información de un throw statement
 * @param {Object} throwStmt - Nodo ThrowStatement
 * @returns {Object}
 */
export function extractThrow(throwStmt, code) {
  const arg = throwStmt.childForFieldName('argument');
  const errorType = arg?.type === 'new_expression'
    ? getCalleeName(arg.childForFieldName('constructor'), code)
    : (arg?.type || 'Error');

  return {
    type: 'throw',
    errorType: errorType,
    message: extractErrorMessage(arg, code),
    line: startLine(throwStmt)
  };
}

/**
 * Extrae el mensaje de error si está disponible
 * @param {Object} node - Nodo del error (NewExpression u otro)
 * @returns {string|null}
 */
function extractErrorMessage(node, code) {
  if (node?.type === 'new_expression') {
    const argsNode = node.childForFieldName('arguments');
    if (argsNode && argsNode.namedChildCount > 0) {
      const firstArg = argsNode.namedChildren[0];
      if (firstArg.type === 'string') {
        const fullText = text(firstArg, code);
        // Quitar comillas
        return fullText.replace(/^['"`]|['"`]$/g, '');
      }
    }
  }
  return null;
}

export default { extractThrow };

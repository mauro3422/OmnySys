/**
 * @fileoverview Throw Extractor
 * 
 * Extrae información de throw statements.
 * 
 * @module data-flow/output-extractor/extractors/throw-extractor
 * @version 1.0.0
 */

import { getCalleeName, nodeToString } from '../helpers/ast-helpers.js';

/**
 * Extrae información de un throw statement
 * @param {Object} throwStmt - Nodo ThrowStatement
 * @returns {Object}
 */
export function extractThrow(throwStmt) {
  const arg = throwStmt.argument;
  const errorType = arg?.type === 'NewExpression' 
    ? getCalleeName(arg.callee)
    : (arg?.type || 'Error');

  return {
    type: 'throw',
    errorType: errorType,
    message: extractErrorMessage(arg),
    line: throwStmt.loc?.start?.line
  };
}

/**
 * Extrae el mensaje de error si está disponible
 * @param {Object} node - Nodo del error (NewExpression u otro)
 * @returns {string|null}
 */
function extractErrorMessage(node) {
  if (node?.type === 'NewExpression' && node.arguments.length > 0) {
    const firstArg = node.arguments[0];
    if (firstArg.type === 'StringLiteral') {
      return firstArg.value;
    }
  }
  return null;
}

export default { extractThrow };

/**
 * @fileoverview Expression Processor
 * 
 * Procesa expression statements.
 * 
 * @module transformation-extractor/processors/expression-processor
 * @version 1.0.0
 */

import { handleMutatingCall } from '../handlers/mutation-handler.js';
import { processAssignment, processUpdateExpression } from './variable-processor.js';
import { startLine } from '../../../utils/ts-ast-utils.js';

/**
 * Procesa expression statements
 * @param {Object} stmt - ExpressionStatement
 * @param {Object} callbacks - Callbacks
 */
export function processExpressionStatement(stmt, callbacks) {
  // En Tree-sitter el nodo expression_statement tiene un hijo nombrado que es la expresión
  const expr = stmt.namedChildren[0];
  if (!expr) return;

  // Assignment: x = y
  if (expr.type === 'assignment_expression') {
    processAssignment(expr, callbacks);
    return;
  }

  // Update expression: x++, x--
  if (expr.type === 'update_expression') {
    processUpdateExpression(expr, callbacks);
    return;
  }

  // Método que muta: arr.push(x)
  if (expr.type === 'call_expression') {
    const handled = handleMutatingCall(expr, callbacks.addTransformation, callbacks.code);
    if (handled) return;

    // Si no es mutación, podría ser una llamada pura
    // que produce efectos secundarios
    processPureCall(expr, callbacks);
  }
}

/**
 * Procesa llamadas puras (no mutantes)
 * @param {Object} callExpr - CallExpression
 * @param {Object} callbacks - Callbacks
 */
function processPureCall(callExpr, callbacks) {
  // Por ahora no extraemos transformaciones de llamadas puras
  // porque no sabemos qué retornan sin análisis de la función
  // En el futuro esto podría integrarse con análisis interprocedural
}

import { extractSources } from '../core/source-extractor.js';
import { classifyOperation } from '../core/operation-classifier.js';

/**
 * Procesa expresiones de retorno implícito (arrow functions)
 * @param {Object} expr - Expresión
 * @param {Object} callbacks - Callbacks
 */
export function processImplicitReturn(expr, callbacks) {
  const code = callbacks.code || '';
  const sources = extractSources(expr, code);
  const operation = classifyOperation(expr, code);

  callbacks.addTransformation({
    to: '<return>',
    from: sources.length === 1 ? sources[0] : sources,
    operation: operation.type,
    via: operation.via,
    type: 'implicit_return',
    line: startLine(expr)
  });
}

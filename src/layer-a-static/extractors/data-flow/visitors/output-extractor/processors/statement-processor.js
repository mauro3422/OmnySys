/**
 * @fileoverview Statement Processor
 * 
 * Procesa statements del cuerpo de una función.
 * 
 * @module data-flow/output-extractor/processors/statement-processor
 * @version 1.0.0
 */

/**
 * Procesa statements recursivamente
 * @param {Array} statements - Lista de statements
 * @param {Object} handlers - Handlers para cada tipo de statement
 * @param {Object} state - Estado compartido (outputs, flags)
 */
export function processStatements(statements, handlers, state) {
  for (const stmt of statements) {
    processStatement(stmt, handlers, state);
  }
}

/**
 * Procesa un statement individual
 * @param {Object} stmt - Statement AST node
 * @param {Object} handlers - Handlers para cada tipo
 * @param {Object} state - Estado compartido
 */
export function processStatement(stmt, handlers, state) {
  if (!stmt) return;

  switch (stmt.type) {
    case 'return_statement':
      if (handlers.onReturn) {
        const output = handlers.onReturn(stmt);
        if (output) state.outputs.push(output);
      }
      state.hasReturn = true;
      break;

    case 'throw_statement':
      if (handlers.onThrow) {
        const output = handlers.onThrow(stmt);
        if (output) state.outputs.push(output);
      }
      break;

    case 'expression_statement':
      if (handlers.onSideEffect) {
        const expression = stmt.namedChildren[0];
        const output = handlers.onSideEffect(expression);
        if (output) {
          state.outputs.push(output);
          state.hasSideEffect = true;
        }
      }
      break;

    case 'if_statement':
      processIfStatement(stmt, handlers, state);
      break;

    case 'try_statement':
      processTryStatement(stmt, handlers, state);
      break;

    case 'switch_statement':
      processSwitchStatement(stmt, handlers, state);
      break;

    case 'statement_block':
      processStatements(stmt.namedChildren, handlers, state);
      break;

    case 'for_statement':
    case 'for_in_statement':
    case 'for_of_statement':
    case 'while_statement':
    case 'do_statement':
      processLoop(stmt, handlers, state);
      break;
  }
}

/**
 * Procesa if statement
 * @param {Object} stmt - IfStatement node
 * @param {Object} handlers - Handlers
 * @param {Object} state - Estado
 */
function processIfStatement(stmt, handlers, state) {
  const consequent = stmt.childForFieldName('consequent');
  const alternate = stmt.childForFieldName('alternate');

  processStatement(consequent, handlers, state);
  if (alternate) {
    processStatement(alternate, handlers, state);
  }
}

/**
 * Procesa try statement
 * @param {Object} stmt - TryStatement node
 * @param {Object} handlers - Handlers
 * @param {Object} state - Estado
 */
function processTryStatement(stmt, handlers, state) {
  const body = stmt.childForFieldName('body');
  const handler = stmt.childForFieldName('handler');
  const finalizer = stmt.childForFieldName('finalizer');

  processStatement(body, handlers, state);
  if (handler) {
    const handlerBody = handler.childForFieldName('body');
    processStatement(handlerBody, handlers, state);
  }
  if (finalizer) {
    processStatement(finalizer, handlers, state);
  }
}

/**
 * Procesa switch statement
 * @param {Object} stmt - SwitchStatement node
 * @param {Object} handlers - Handlers
 * @param {Object} state - Estado
 */
function processSwitchStatement(stmt, handlers, state) {
  for (const child of stmt.namedChildren) {
    if (child.type === 'switch_case' || child.type === 'switch_default') {
      processStatements(child.namedChildren, handlers, state);
    }
  }
}

/**
 * Procesa loops
 * @param {Object} loop - Loop node
 * @param {Object} handlers - Handlers
 * @param {Object} state - Estado
 */
function processLoop(loop, handlers, state) {
  const body = loop.childForFieldName('body');
  processStatement(body, handlers, state);
}

export default { processStatements, processStatement };

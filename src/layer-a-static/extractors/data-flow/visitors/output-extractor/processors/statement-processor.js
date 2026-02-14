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
    case 'ReturnStatement':
      if (handlers.onReturn) {
        const output = handlers.onReturn(stmt);
        if (output) state.outputs.push(output);
      }
      state.hasReturn = true;
      break;
      
    case 'ThrowStatement':
      if (handlers.onThrow) {
        const output = handlers.onThrow(stmt);
        if (output) state.outputs.push(output);
      }
      break;
      
    case 'ExpressionStatement':
      if (handlers.onSideEffect) {
        const output = handlers.onSideEffect(stmt.expression);
        if (output) {
          state.outputs.push(output);
          state.hasSideEffect = true;
        }
      }
      break;
      
    case 'IfStatement':
      processIfStatement(stmt, handlers, state);
      break;
      
    case 'TryStatement':
      processTryStatement(stmt, handlers, state);
      break;
      
    case 'SwitchStatement':
      processSwitchStatement(stmt, handlers, state);
      break;
      
    case 'BlockStatement':
      processStatements(stmt.body, handlers, state);
      break;
      
    case 'ForStatement':
    case 'ForOfStatement':
    case 'ForInStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
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
  processStatement(stmt.consequent, handlers, state);
  if (stmt.alternate) {
    processStatement(stmt.alternate, handlers, state);
  }
}

/**
 * Procesa try statement
 * @param {Object} stmt - TryStatement node
 * @param {Object} handlers - Handlers
 * @param {Object} state - Estado
 */
function processTryStatement(stmt, handlers, state) {
  processStatement(stmt.block, handlers, state);
  if (stmt.handler) {
    processStatement(stmt.handler.body, handlers, state);
  }
  if (stmt.finalizer) {
    processStatement(stmt.finalizer, handlers, state);
  }
}

/**
 * Procesa switch statement
 * @param {Object} stmt - SwitchStatement node
 * @param {Object} handlers - Handlers
 * @param {Object} state - Estado
 */
function processSwitchStatement(stmt, handlers, state) {
  for (const case_ of stmt.cases) {
    for (const stmt_ of case_.consequent) {
      processStatement(stmt_, handlers, state);
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
  processStatement(loop.body, handlers, state);
}

export default { processStatements, processStatement };

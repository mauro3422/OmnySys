/**
 * @fileoverview Statement Processor
 * 
 * Procesa statements AST y los delega a handlers específicos.
 * 
 * @module transformation-extractor/processors/statement-processor
 * @version 1.0.0
 */

/**
 * Procesa un statement según su tipo
 * @param {Object} stmt - Statement AST
 * @param {Object} handlers - Handlers para cada tipo
 * @returns {boolean} - True si fue procesado
 */
export function processStatement(stmt, handlers) {
  if (!stmt) return false;

  const processors = {
    'VariableDeclaration': handlers.variable,
    'ExpressionStatement': handlers.expression,
    'IfStatement': handlers.ifStatement,
    'TryStatement': handlers.tryStatement,
    'ForStatement': handlers.loop,
    'ForOfStatement': handlers.loop,
    'ForInStatement': handlers.loop,
    'WhileStatement': handlers.loop,
    'DoWhileStatement': handlers.loop,
    'BlockStatement': handlers.block,
    'SwitchStatement': handlers.switch
  };

  const processor = processors[stmt.type];
  
  if (processor) {
    processor(stmt);
    return true;
  }

  return false;
}

/**
 * Procesa if statements
 * @param {Object} stmt - IfStatement
 * @param {Object} context - Contexto de procesamiento
 */
export function processIfStatement(stmt, context) {
  // Procesar consecuente
  if (stmt.consequent) {
    processStatement(stmt.consequent, context.handlers);
  }
  
  // Procesar alternativo si existe
  if (stmt.alternate) {
    processStatement(stmt.alternate, context.handlers);
  }
}

/**
 * Procesa try-catch-finally
 * @param {Object} stmt - TryStatement
 * @param {Object} context - Contexto de procesamiento
 */
export function processTryStatement(stmt, context) {
  // Procesar bloque try
  if (stmt.block) {
    processStatement(stmt.block, context.handlers);
  }
  
  // Procesar handler catch
  if (stmt.handler?.body) {
    processStatement(stmt.handler.body, context.handlers);
  }
  
  // Procesar finally
  if (stmt.finalizer) {
    processStatement(stmt.finalizer, context.handlers);
  }
}

/**
 * Procesa loops
 * @param {Object} loop - Loop statement
 * @param {Object} context - Contexto de procesamiento
 */
export function processLoop(loop, context) {
  // Procesar el cuerpo del loop
  if (loop.body) {
    processStatement(loop.body, context.handlers);
  }
}

/**
 * Procesa bloques
 * @param {Object} block - BlockStatement
 * @param {Object} context - Contexto de procesamiento
 */
export function processBlock(block, context) {
  const statements = block.body || [];
  for (const subStmt of statements) {
    processStatement(subStmt, context.handlers);
  }
}

/**
 * Procesa switch statements
 * @param {Object} stmt - SwitchStatement
 * @param {Object} context - Contexto de procesamiento
 */
export function processSwitchStatement(stmt, context) {
  for (const case_ of stmt.cases || []) {
    for (const consequent of case_.consequent) {
      processStatement(consequent, context.handlers);
    }
  }
}

/**
 * Factory para crear contexto de procesamiento
 * @param {Object} handlers - Mapa de handlers
 * @returns {Object} - Contexto
 */
export function createProcessingContext(handlers) {
  return {
    handlers: {
      variable: handlers.variable || (() => {}),
      expression: handlers.expression || (() => {}),
      ifStatement: handlers.ifStatement || (() => {}),
      tryStatement: handlers.tryStatement || (() => {}),
      loop: handlers.loop || (() => {}),
      block: handlers.block || (() => {}),
      switch: handlers.switch || (() => {})
    }
  };
}

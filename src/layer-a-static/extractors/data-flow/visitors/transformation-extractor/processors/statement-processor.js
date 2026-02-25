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
    'lexical_declaration': handlers.variable,
    'variable_declaration': handlers.variable,
    'expression_statement': handlers.expression,
    'if_statement': handlers.ifStatement,
    'try_statement': handlers.tryStatement,
    'for_statement': handlers.loop,
    'for_in_statement': handlers.loop,
    'while_statement': handlers.loop,
    'do_statement': handlers.loop,
    'statement_block': handlers.block,
    'switch_statement': handlers.switch
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
  // Procesar consecuente (en Tree-sitter: field 'consequent')
  const consequent = stmt.childForFieldName('consequent');
  if (consequent) {
    processStatement(consequent, context.handlers);
  }

  // Procesar alternativo (en Tree-sitter: field 'alternate')
  const alternate = stmt.childForFieldName('alternate');
  if (alternate) {
    processStatement(alternate, context.handlers);
  }
}

/**
 * Procesa try-catch-finally
 * @param {Object} stmt - TryStatement
 * @param {Object} context - Contexto de procesamiento
 */
export function processTryStatement(stmt, context) {
  // Procesar bloque try (field 'body')
  const body = stmt.childForFieldName('body');
  if (body) {
    processStatement(body, context.handlers);
  }

  // Procesar handler catch (field 'handler')
  const handler = stmt.childForFieldName('handler');
  const handlerBody = handler?.childForFieldName('body');
  if (handlerBody) {
    processStatement(handlerBody, context.handlers);
  }

  // Procesar finally (field 'finalizer')
  const finalizer = stmt.childForFieldName('finalizer');
  if (finalizer) {
    processStatement(finalizer, context.handlers);
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
  const statements = block.namedChildren || [];
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
  // Tree-sitter switch_statement has switch_body with switch_case / switch_default
  const body = stmt.childForFieldName('body');
  if (!body) return;

  for (const child of body.namedChildren) {
    if (child.type === 'switch_case' || child.type === 'switch_default') {
      // Los statements están en los hijos nombrados después del label
      for (const caseChild of child.namedChildren) {
        if (caseChild.type !== 'identifier' && caseChild.type !== 'default') {
          processStatement(caseChild, context.handlers);
        }
      }
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
      variable: handlers.variable || (() => { }),
      expression: handlers.expression || (() => { }),
      ifStatement: handlers.ifStatement || (() => { }),
      tryStatement: handlers.tryStatement || (() => { }),
      loop: handlers.loop || (() => { }),
      block: handlers.block || (() => { }),
      switch: handlers.switch || (() => { })
    }
  };
}

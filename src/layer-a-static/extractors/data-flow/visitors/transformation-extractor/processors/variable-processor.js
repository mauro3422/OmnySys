/**
 * @fileoverview Variable Processor
 * 
 * Procesa declaraciones de variables y sus inicializaciones.
 * 
 * @module transformation-extractor/processors/variable-processor
 * @version 1.0.0
 */

import { handleDestructuring } from '../handlers/destructuring-handler.js';
import { getAssignmentTarget, getIdentifierName, startLine, text } from '../../../utils/ts-ast-utils.js';

/**
 * Procesa declaraciones de variables: const, let, var
 * @param {Object} decl - VariableDeclaration node
 * @param {Object} callbacks - Callbacks para agregar transformaciones
 */
export function processVariableDeclaration(decl, callbacks) {
  // En Tree-sitter, una declaración (const x=1, y=2) tiene múltiples variable_declarator
  const declarators = decl.namedChildren.filter(c => c.type === 'variable_declarator');

  for (const declarator of declarators) {
    const id = declarator.childForFieldName('name');
    const init = declarator.childForFieldName('value');

    if (!init) continue;

    // Simple assignment: const x = value
    if (id.type === 'identifier') {
      const name = text(id, callbacks.code || ''); // Asegurarse de tener el código
      callbacks.extractTransformation(name, init, {
        type: 'assignment',
        line: startLine(declarator),
        kind: decl.type === 'lexical_declaration' ? 'const/let' : 'var'
      });
    }
    // Destructuring: const { x, y } = obj
    else if (id.type === 'object_pattern' || id.type === 'array_pattern') {
      handleDestructuring(
        id,
        init,
        callbacks.addTransformation,
        callbacks.trackVariable,
        callbacks.code
      );
    }
  }
}


/**
 * Procesa reasignaciones: x = y
 * @param {Object} expr - AssignmentExpression
 * @param {Object} callbacks - Callbacks
 */
export function processAssignment(expr, callbacks) {
  const left = expr.childForFieldName('left');
  const right = expr.childForFieldName('right');

  const target = getAssignmentTarget(left, callbacks.code);
  if (target) {
    callbacks.extractTransformation(target, right, {
      type: 'reassignment',
      line: startLine(expr)
    });
  }
}

/**
 * Procesa update expressions: x++, x--
 * @param {Object} expr - UpdateExpression
 * @param {Object} callbacks - Callbacks
 */
export function processUpdateExpression(expr, callbacks) {
  const argumentNode = expr.namedChildren.find(c => c.type === 'identifier' || c.type === 'member_expression');
  const target = getIdentifierName(argumentNode, callbacks.code);

  if (target) {
    // En Tree-sitter el operador está entre los hijos
    const operator = expr.children.find(c => c.type === '++' || c.type === '--')?.type || 'update';

    callbacks.addTransformation({
      to: target,
      from: target,
      operation: 'update',
      via: operator,
      line: startLine(expr),
      type: 'update'
    });

    callbacks.trackVariable(target);
  }
}

/**
 * Procesa declaración de función como variable
 * @param {Object} declarator - VariableDeclarator
 * @param {Object} callbacks - Callbacks
 */
export function processFunctionVariable(declarator, callbacks) {
  const init = declarator.childForFieldName('value');
  const id = declarator.childForFieldName('name');

  if (init && (init.type === 'function_expression' || init.type === 'arrow_function')) {
    if (id && id.type === 'identifier') {
      callbacks.trackVariable(text(id, callbacks.code));
    }
  }
}

/**
 * @fileoverview Variable Processor
 * 
 * Procesa declaraciones de variables y sus inicializaciones.
 * 
 * @module transformation-extractor/processors/variable-processor
 * @version 1.0.0
 */

import { handleDestructuring } from '../handlers/destructuring-handler.js';

/**
 * Procesa declaraciones de variables: const, let, var
 * @param {Object} decl - VariableDeclaration node
 * @param {Object} callbacks - Callbacks para agregar transformaciones
 */
export function processVariableDeclaration(decl, callbacks) {
  for (const declarator of decl.declarations) {
    const id = declarator.id;
    const init = declarator.init;

    if (!init) continue;

    // Simple assignment: const x = value
    if (id.type === 'Identifier') {
      callbacks.extractTransformation(id.name, init, {
        type: 'assignment',
        line: declarator.loc?.start?.line,
        kind: decl.kind // const, let, var
      });
    }
    // Destructuring: const { x, y } = obj
    else if (id.type === 'ObjectPattern' || id.type === 'ArrayPattern') {
      handleDestructuring(
        id, 
        init, 
        callbacks.addTransformation, 
        callbacks.trackVariable
      );
    }
  }
}

import { getAssignmentTarget, getIdentifierName } from '../utils/ast-helpers.js';

/**
 * Procesa reasignaciones: x = y
 * @param {Object} expr - AssignmentExpression
 * @param {Object} callbacks - Callbacks
 */
export function processAssignment(expr, callbacks) {
  
  const target = getAssignmentTarget(expr.left);
  if (target) {
    callbacks.extractTransformation(target, expr.right, {
      type: 'reassignment',
      line: expr.loc?.start?.line
    });
  }
}

/**
 * Procesa update expressions: x++, x--
 * @param {Object} expr - UpdateExpression
 * @param {Object} callbacks - Callbacks
 */
export function processUpdateExpression(expr, callbacks) {
  
  const target = getIdentifierName(expr.argument);
  if (target) {
    callbacks.addTransformation({
      to: target,
      from: target,
      operation: 'update',
      via: expr.operator,
      line: expr.loc?.start?.line,
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
  if (declarator.init?.type === 'FunctionExpression' ||
      declarator.init?.type === 'ArrowFunctionExpression') {
    // La función se procesa separadamente
    // Aquí solo registramos la asignación
    if (declarator.id?.type === 'Identifier') {
      callbacks.trackVariable(declarator.id.name);
    }
  }
}

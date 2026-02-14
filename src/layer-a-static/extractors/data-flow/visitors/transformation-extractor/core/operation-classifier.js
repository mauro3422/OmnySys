/**
 * @fileoverview Operation Classifier
 * 
 * Clasifica operaciones AST en tipos de transformación.
 * Centraliza la lógica de clasificación de operaciones.
 * 
 * @module transformation-extractor/core/operation-classifier
 * @version 1.0.0
 */

import { getCalleeName, getMemberPath } from '../utils/ast-helpers.js';

// Tipos de operaciones soportados
export const OPERATION_TYPES = {
  FUNCTION_CALL: 'function_call',
  BINARY_OPERATION: 'binary_operation',
  UNARY_OPERATION: 'unary_operation',
  UPDATE: 'update',
  PROPERTY_ACCESS: 'property_access',
  CONDITIONAL: 'conditional',
  ARRAY_LITERAL: 'array_literal',
  OBJECT_LITERAL: 'object_literal',
  SPREAD: 'spread',
  TEMPLATE_LITERAL: 'template_literal',
  INSTANTIATION: 'instantiation',
  ASSIGNMENT: 'assignment',
  AWAIT_FUNCTION: 'await_function_call',
  AWAIT_BINARY: 'await_binary_operation'
};

/**
 * Clasifica el tipo de operación de un nodo AST
 * @param {Object} node - Nodo AST
 * @returns {Object} - Clasificación de la operación
 */
export function classifyOperation(node) {
  if (!node) {
    return { type: OPERATION_TYPES.ASSIGNMENT, via: null, details: {} };
  }

  const classifiers = [
    classifyAwait,
    classifyCall,
    classifyBinary,
    classifyUnary,
    classifyUpdate,
    classifyMember,
    classifyConditional,
    classifyArray,
    classifyObject,
    classifySpread,
    classifyTemplate,
    classifyNew
  ];

  for (const classifier of classifiers) {
    const result = classifier(node);
    if (result) return result;
  }

  // Default
  return {
    type: OPERATION_TYPES.ASSIGNMENT,
    via: null,
    details: { nodeType: node.type }
  };
}

/**
 * Clasifica expresiones await
 * @private
 */
function classifyAwait(node) {
  if (node.type !== 'AwaitExpression') return null;
  
  const inner = classifyOperation(node.argument);
  return {
    ...inner,
    type: `await_${inner.type}`,
    details: { ...inner.details, isAsync: true }
  };
}

/**
 * Clasifica llamadas a función
 * @private
 */
function classifyCall(node) {
  if (node.type !== 'CallExpression') return null;
  
  const calleeName = getCalleeName(node.callee);
  return {
    type: OPERATION_TYPES.FUNCTION_CALL,
    via: calleeName,
    details: { argumentCount: node.arguments.length }
  };
}

/**
 * Clasifica operaciones binarias/lógicas
 * @private
 */
function classifyBinary(node) {
  if (node.type !== 'BinaryExpression' && node.type !== 'LogicalExpression') {
    return null;
  }
  
  return {
    type: OPERATION_TYPES.BINARY_OPERATION,
    via: node.operator,
    details: { operator: node.operator }
  };
}

/**
 * Clasifica operaciones unarias
 * @private
 */
function classifyUnary(node) {
  if (node.type !== 'UnaryExpression') return null;
  
  return {
    type: OPERATION_TYPES.UNARY_OPERATION,
    via: node.operator,
    details: { operator: node.operator, prefix: node.prefix }
  };
}

/**
 * Clasifica operaciones de update (++, --)
 * @private
 */
function classifyUpdate(node) {
  if (node.type !== 'UpdateExpression') return null;
  
  return {
    type: OPERATION_TYPES.UPDATE,
    via: node.operator,
    details: { operator: node.operator, prefix: node.prefix }
  };
}

/**
 * Clasifica acceso a propiedades
 * @private
 */
function classifyMember(node) {
  if (node.type !== 'MemberExpression') return null;
  
  const path = getMemberPath(node);
  return {
    type: OPERATION_TYPES.PROPERTY_ACCESS,
    via: 'property_access',
    details: { path }
  };
}

/**
 * Clasifica expresiones condicionales (ternarias)
 * @private
 */
function classifyConditional(node) {
  if (node.type !== 'ConditionalExpression') return null;
  
  return {
    type: OPERATION_TYPES.CONDITIONAL,
    via: 'ternary',
    details: {}
  };
}

/**
 * Clasifica arrays literales
 * @private
 */
function classifyArray(node) {
  if (node.type !== 'ArrayExpression') return null;
  
  return {
    type: OPERATION_TYPES.ARRAY_LITERAL,
    via: 'array_constructor',
    details: { elementCount: node.elements.length }
  };
}

/**
 * Clasifica objetos literales
 * @private
 */
function classifyObject(node) {
  if (node.type !== 'ObjectExpression') return null;
  
  return {
    type: OPERATION_TYPES.OBJECT_LITERAL,
    via: 'object_constructor',
    details: { propertyCount: node.properties.length }
  };
}

/**
 * Clasifica spread elements
 * @private
 */
function classifySpread(node) {
  if (node.type !== 'SpreadElement') return null;
  
  return {
    type: OPERATION_TYPES.SPREAD,
    via: 'spread_operator',
    details: {}
  };
}

/**
 * Clasifica template literals
 * @private
 */
function classifyTemplate(node) {
  if (node.type !== 'TemplateLiteral') return null;
  
  return {
    type: OPERATION_TYPES.TEMPLATE_LITERAL,
    via: 'template',
    details: { hasExpressions: node.expressions.length > 0 }
  };
}

/**
 * Clasifica expresiones new
 * @private
 */
function classifyNew(node) {
  if (node.type !== 'NewExpression') return null;
  
  const calleeName = getCalleeName(node.callee);
  return {
    type: OPERATION_TYPES.INSTANTIATION,
    via: calleeName,
    details: { className: calleeName }
  };
}

/**
 * Obtiene lista de todos los tipos de operación
 * @returns {Array<string>} - Lista de tipos
 */
export function getOperationTypes() {
  return Object.values(OPERATION_TYPES);
}

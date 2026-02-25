/**
 * @fileoverview Operation Classifier
 * 
 * Clasifica operaciones AST en tipos de transformación.
 * Centraliza la lógica de clasificación de operaciones.
 * 
 * @module transformation-extractor/core/operation-classifier
 * @version 1.0.0
 */

import { getMemberPath, text } from '../../../utils/ts-ast-utils.js';

function getCalleeName(node, code) {
  if (!node) return '<anonymous>';
  return getMemberPath(node, code) || text(node, code) || '<anonymous>';
}

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
 * Clasifica el tipo de operación de un nodo AST (Tree-sitter)
 * @param {Object} node - Nodo Tree-sitter
 * @param {string} code - Código fuente
 * @returns {Object} - Clasificación de la operación
 */
export function classifyOperation(node, code) {
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
    const result = classifier(node, code);
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
function classifyAwait(node, code) {
  if (node.type !== 'await_expression') return null;

  const argument = node.namedChildren[0];
  const inner = classifyOperation(argument, code);
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
function classifyCall(node, code) {
  if (node.type !== 'call_expression') return null;

  const calleeNode = node.childForFieldName('function');
  const argumentsNode = node.childForFieldName('arguments');

  const calleeName = getCalleeName(calleeNode, code);
  return {
    type: OPERATION_TYPES.FUNCTION_CALL,
    via: calleeName,
    details: { argumentCount: argumentsNode ? argumentsNode.namedChildCount : 0 }
  };
}

/**
 * Clasifica operaciones binarias/lógicas
 * @private
 */
function classifyBinary(node, code) {
  if (node.type !== 'binary_expression' && node.type !== 'logical_expression') {
    return null;
  }

  // En Tree-sitter el operador es un hijo con tipo de operador
  const operator = node.children.find(c => !c.isNamed() && !['(', ')'].includes(c.type))?.type || 'unknown';

  return {
    type: OPERATION_TYPES.BINARY_OPERATION,
    via: operator,
    details: { operator }
  };
}

/**
 * Clasifica operaciones unarias
 * @private
 */
function classifyUnary(node, code) {
  if (node.type !== 'unary_expression') return null;

  const operator = node.children.find(c => !c.isNamed())?.type || 'unknown';

  return {
    type: OPERATION_TYPES.UNARY_OPERATION,
    via: operator,
    details: { operator }
  };
}

/**
 * Clasifica operaciones de update (++, --)
 * @private
 */
function classifyUpdate(node, code) {
  if (node.type !== 'update_expression') return null;

  const operator = node.children.find(c => c.type === '++' || c.type === '--')?.type || 'update';

  return {
    type: OPERATION_TYPES.UPDATE,
    via: operator,
    details: { operator }
  };
}

/**
 * Clasifica acceso a propiedades
 * @private
 */
function classifyMember(node, code) {
  if (node.type !== 'member_expression') return null;

  const path = getMemberPath(node, code);
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
function classifyConditional(node, code) {
  if (node.type !== 'ternary_expression') return null;

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
function classifyArray(node, code) {
  if (node.type !== 'array') return null;

  return {
    type: OPERATION_TYPES.ARRAY_LITERAL,
    via: 'array_constructor',
    details: { elementCount: node.namedChildCount }
  };
}

/**
 * Clasifica objetos literales
 * @private
 */
function classifyObject(node, code) {
  if (node.type !== 'object') return null;

  return {
    type: OPERATION_TYPES.OBJECT_LITERAL,
    via: 'object_constructor',
    details: { propertyCount: node.namedChildCount }
  };
}

/**
 * Clasifica spread elements
 * @private
 */
function classifySpread(node, code) {
  if (node.type !== 'spread_element') return null;

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
function classifyTemplate(node, code) {
  if (node.type !== 'template_string') return null;

  const hasExpressions = node.namedChildren.some(c => c.type === 'template_substitution');
  return {
    type: OPERATION_TYPES.TEMPLATE_LITERAL,
    via: 'template',
    details: { hasExpressions }
  };
}

/**
 * Clasifica expresiones new
 * @private
 */
function classifyNew(node, code) {
  if (node.type !== 'new_expression') return null;

  const constructorNode = node.childForFieldName('constructor');
  const calleeName = getCalleeName(constructorNode, code);
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

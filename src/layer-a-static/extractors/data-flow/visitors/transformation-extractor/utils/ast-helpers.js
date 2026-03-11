/**
 * @fileoverview AST Helpers
 * 
 * Funciones utilitarias para trabajar con nodos AST de Babel.
 * 
 * @module transformation-extractor/utils/ast-helpers
 * @version 1.0.0
 */

import {
  getAssignmentTarget as getSharedAssignmentTarget,
  getCalleeName as getSharedCalleeName,
  findFunctionNode as getSharedFunctionNode,
  getIdentifierName as getSharedIdentifierName,
  isFunctionNode as isSharedFunctionNode,
  getMemberPath as getSharedMemberPath
} from '../../output-extractor/helpers/ast-helpers.js';

/**
 * Obtiene el path de un member expression
 * @param {Object} node - Nodo AST
 * @returns {string|null} - Path en formato "obj.prop" o null
 */
export function getMemberPath(node) {
  return getSharedMemberPath(node);
}

/**
 * Obtiene nombre de callee (función llamada)
 * @param {Object} node - Nodo callee
 * @returns {string} - Nombre de la función o '<anonymous>'
 */
export function getCalleeName(node) {
  return getSharedCalleeName(node);
}

/**
 * Obtiene nombre de identifier
 * @param {Object} node - Nodo AST
 * @returns {string|null} - Nombre o null
 */
export function getIdentifierName(node) {
  return getSharedIdentifierName(node);
}

/**
 * Obtiene target de asignación
 * @param {Object} node - Nodo left de AssignmentExpression
 * @returns {string|null} - Nombre del target o null
 */
export function getAssignmentTarget(node) {
  return getSharedAssignmentTarget(node);
}

/**
 * Verifica si un nodo es una función
 * @param {Object} node - Nodo AST
 * @returns {boolean} - True si es función
 */
export function isFunctionNode(node) {
  return isSharedFunctionNode(node);
}

/**
 * Encuentra el nodo de función en un AST
 * @param {Object} ast - AST completo o nodo
 * @returns {Object|null} - Nodo de función o null
 */
export function findFunctionNode(ast) {
  if (isFunctionNode(ast)) {
    return ast;
  }

  return getSharedFunctionNode(ast);
}

/**
 * Obtiene el cuerpo de una función
 * @param {Object} functionNode - Nodo de función
 * @returns {Object|null} - Body o null
 */
export function getFunctionBody(functionNode) {
  return functionNode?.body || null;
}

/**
 * Verifica si es arrow function con expresión implícita
 * @param {Object} functionNode - Nodo de función
 * @returns {boolean} - True si es expresión implícita
 */
export function isImplicitReturn(functionNode) {
  return functionNode?.type === 'ArrowFunctionExpression' && 
         functionNode.body?.type !== 'BlockStatement';
}

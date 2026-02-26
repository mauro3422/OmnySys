/**
 * @fileoverview ast-utils.js
 * 
 * Utilidades para trabajar con nodos AST
 * 
 * @module analyses/tier3/event-detector/ast-utils
 */

import { text } from '../../../extractors/data-flow/utils/ts-ast-utils.js';

/**
 * Extrae el nombre del evento de un argumento Tree-sitter
 * @param {object} node - Nodo Tree-sitter
 * @param {string} code - Código fuente
 * @returns {string|null} - Nombre del evento o null
 */
export function extractEventName(node, code) {
  if (!node) return null;

  // String literal en Tree-sitter
  if (node.type === 'string' || node.type === 'string_fragment' || node.type === 'template_string') {
    return text(node, code).replace(/['"`]/g, '');
  }

  return null;
}

/**
 * Calcula confianza basada en tipo de nodo
 * @param {object} node - Nodo Tree-sitter
 * @returns {number} - 0-1
 */
export function getConfidence(node) {
  if (!node) return 0.3;

  if (node.type === 'string' || node.type === 'string_fragment') {
    return 1.0;
  }

  if (node.type === 'template_string') {
    return 0.6;
  }

  if (node.type === 'identifier') {
    return 0.5;
  }

  return 0.3;
}

/**
 * Obtiene el nombre del objeto de una expresión miembro
 * @param {object} node - Nodo member_expression
 * @param {string} code - Código fuente
 * @returns {string|null}
 */
export function getObjectName(node, code) {
  if (node.type !== 'member_expression') return null;

  const objectNode = node.childForFieldName('object');
  return objectNode ? text(objectNode, code) : null;
}

/**
 * Obtiene el nombre del método de una expresión miembro
 * @param {object} node - Nodo member_expression
 * @param {string} code - Código fuente
 * @returns {string|null}
 */
export function getMethodName(node, code) {
  if (node.type !== 'member_expression') return null;

  const propertyNode = node.childForFieldName('property');
  return propertyNode ? text(propertyNode, code) : null;
}

/**
 * Verifica si un nodo es una llamada a método
 * @param {object} node - Nodo call_expression
 * @returns {boolean}
 */
export function isMethodCall(node) {
  if (node.type !== 'call_expression') return false;
  const functionNode = node.childForFieldName('function');
  return functionNode?.type === 'member_expression';
}

/**
 * @fileoverview ast-utils.js
 * 
 * Utilidades para trabajar con nodos AST
 * 
 * @module analyses/tier3/event-detector/ast-utils
 */

/**
 * Extrae el nombre del evento de un argumento AST
 * @param {object} arg - Nodo AST del argumento
 * @returns {string|null} - Nombre del evento o null
 */
export function extractEventName(arg) {
  if (!arg) return null;

  // String literal: .on('event-name', ...)
  if (arg.type === 'StringLiteral') {
    return arg.value;
  }

  // Identifier: .on(EVENT_NAME, ...) - no puedo estar seguro
  if (arg.type === 'Identifier') {
    return null;
  }

  // Template literal: .on(`event:${type}`, ...) - no puedo estar seguro
  if (arg.type === 'TemplateLiteral') {
    return null;
  }

  return null;
}

/**
 * Calcula confianza basada en tipo de argumento
 * @param {object} arg - Nodo AST del argumento
 * @returns {number} - 0-1
 */
export function getConfidence(arg) {
  if (arg?.type === 'StringLiteral') {
    return 1.0;
  }

  if (arg?.type === 'Identifier') {
    return 0.5;
  }

  if (arg?.type === 'TemplateLiteral') {
    return 0.6;
  }

  return 0.3;
}

/**
 * Obtiene el nombre del objeto de una expresión miembro
 * @param {object} callee - Nodo callee de CallExpression
 * @returns {string|null}
 */
export function getObjectName(callee) {
  if (callee.type !== 'MemberExpression') return null;
  
  return callee.object?.name || 
         callee.object?.object?.name || 
         null;
}

/**
 * Obtiene el nombre del método de una expresión miembro
 * @param {object} callee - Nodo callee de CallExpression
 * @returns {string|null}
 */
export function getMethodName(callee) {
  if (callee.type !== 'MemberExpression') return null;
  
  return callee.property?.name || null;
}

/**
 * Verifica si un nodo es una llamada a método (obj.method())
 * @param {object} node - Nodo AST
 * @returns {boolean}
 */
export function isMethodCall(node) {
  return node?.callee?.type === 'MemberExpression' && 
         node.callee.property?.name != null;
}

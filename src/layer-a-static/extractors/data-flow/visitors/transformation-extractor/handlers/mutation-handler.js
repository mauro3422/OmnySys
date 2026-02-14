/**
 * @fileoverview Mutation Handler
 * 
 * Maneja llamadas a métodos que mutan estado (push, pop, etc.).
 * 
 * @module transformation-extractor/handlers/mutation-handler
 * @version 1.0.0
 */

import { getIdentifierName, getMemberPath } from '../utils/ast-helpers.js';

// Métodos mutables comunes de arrays
export const MUTATING_METHODS = [
  'push', 'pop', 'shift', 'unshift', 'splice',
  'sort', 'reverse', 'fill', 'copyWithin'
];

// Métodos mutables de Map y Set
export const MAP_SET_MUTATING_METHODS = [
  'set', 'delete', 'clear'
];

// Métodos mutables de objetos (aunque no nativos, comunes en libs)
export const OBJECT_MUTATING_METHODS = [
  'assign', 'defineProperty', 'delete'
];

/**
 * Verifica si un método es mutante
 * @param {string} methodName - Nombre del método
 * @param {string} objectType - Tipo de objeto (opcional)
 * @returns {boolean} - True si es mutante
 */
export function isMutatingMethod(methodName, objectType = 'array') {
  if (MUTATING_METHODS.includes(methodName)) return true;
  if (MAP_SET_MUTATING_METHODS.includes(methodName)) return true;
  if (OBJECT_MUTATING_METHODS.includes(methodName)) return true;
  return false;
}

/**
 * Maneja una llamada a método mutante
 * @param {Object} callExpr - CallExpression node
 * @param {Function} addTransformation - Callback para agregar transformación
 * @returns {boolean} - True si fue manejada como mutación
 */
export function handleMutatingCall(callExpr, addTransformation) {
  const callee = callExpr.callee;
  
  if (callee.type !== 'MemberExpression') {
    return false;
  }

  const objectName = getIdentifierName(callee.object);
  const methodName = callee.property.name || callee.property.value;

  if (!isMutatingMethod(methodName)) {
    return false;
  }

  // Extraer fuentes de los argumentos
  const sources = [];
  for (const arg of callExpr.arguments) {
    const name = getIdentifierName(arg);
    if (name) sources.push(name);
  }

  addTransformation({
    to: objectName,
    from: sources.length > 0 ? sources : objectName,
    operation: 'mutation',
    via: methodName,
    line: callExpr.loc?.start?.line,
    type: 'mutation',
    details: { 
      method: methodName,
      argumentCount: callExpr.arguments.length
    }
  });

  return true;
}

/**
 * Crea una transformación de mutación
 * @param {string} target - Nombre del objeto objetivo
 * @param {string} method - Nombre del método
 * @param {Array} sources - Fuentes involucradas
 * @param {number} line - Línea del código
 * @param {Object} details - Detalles adicionales
 * @returns {Object} - Transformación
 */
export function createMutationTransformation(target, method, sources, line, details = {}) {
  return {
    to: target,
    from: sources.length > 0 ? sources : target,
    operation: 'mutation',
    via: method,
    line,
    type: 'mutation',
    details: {
      method,
      ...details
    }
  };
}

/**
 * Analiza el impacto de una mutación
 * @param {string} methodName - Nombre del método
 * @returns {Object} - Información del impacto
 */
export function analyzeMutationImpact(methodName) {
  const impactMap = {
    'push': { addsElements: true, removesElements: false, changesOrder: false },
    'pop': { addsElements: false, removesElements: true, changesOrder: false },
    'shift': { addsElements: false, removesElements: true, changesOrder: true },
    'unshift': { addsElements: true, removesElements: false, changesOrder: true },
    'splice': { addsElements: true, removesElements: true, changesOrder: true },
    'sort': { addsElements: false, removesElements: false, changesOrder: true },
    'reverse': { addsElements: false, removesElements: false, changesOrder: true },
    'fill': { addsElements: false, removesElements: false, changesOrder: false, changesValues: true },
    'copyWithin': { addsElements: false, removesElements: false, changesOrder: false, changesValues: true }
  };

  return impactMap[methodName] || { unknown: true };
}

/**
 * Obtiene todos los métodos mutantes conocidos
 * @returns {Array<string>} - Lista de métodos
 */
export function getAllMutatingMethods() {
  return [
    ...MUTATING_METHODS,
    ...MAP_SET_MUTATING_METHODS,
    ...OBJECT_MUTATING_METHODS
  ];
}

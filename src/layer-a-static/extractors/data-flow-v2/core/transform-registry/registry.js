/**
 * @fileoverview Transform Registry
 * 
 * Registro y búsqueda de transformaciones.
 * 
 * @module data-flow-v2/transform-registry/registry
 * @version 1.0.0
 */

import { ArithmeticTransforms } from './categories/arithmetic.js';
import { LogicalTransforms, ComparisonTransforms } from './categories/logical.js';
import { StructuralTransforms } from './categories/structural.js';
import { FunctionalTransforms } from './categories/functional.js';
import { ControlTransforms } from './categories/control.js';
import { SideEffectTransforms } from './categories/side-effects.js';

// Registry cache for fast lookups
const transformCache = new Map();
const operatorCache = new Map();
const categoryCache = new Map();

/**
 * Construye el caché del registro
 */
function buildCache() {
  if (transformCache.size > 0) return;
  
  const allTransforms = {
    ...ArithmeticTransforms,
    ...LogicalTransforms,
    ...ComparisonTransforms,
    ...StructuralTransforms,
    ...FunctionalTransforms,
    ...ControlTransforms,
    ...SideEffectTransforms
  };
  
  for (const [key, transform] of Object.entries(allTransforms)) {
    // Cache by type
    transformCache.set(transform.type, transform);
    transformCache.set(key, transform);
    
    // Cache by operator
    if (transform.operator) {
      const existing = operatorCache.get(transform.operator) || [];
      existing.push(transform);
      operatorCache.set(transform.operator, existing);
    }
    
    // Cache by category
    if (transform.category) {
      const existing = categoryCache.get(transform.category) || [];
      existing.push(transform);
      categoryCache.set(transform.category, existing);
    }
  }
}

/**
 * Obtiene una transformación por su tipo
 * @param {string} type - Tipo de transformación
 * @returns {Object|undefined}
 */
export function getTransform(type) {
  buildCache();
  return transformCache.get(type);
}

/**
 * Obtiene transformaciones por operador
 * @param {string} operator - Operador
 * @returns {Object[]}
 */
export function getTransformByOperator(operator) {
  buildCache();
  const transforms = operatorCache.get(operator);
  return transforms ? transforms[0] : undefined;
}

/**
 * Obtiene todas las transformaciones de una categoría
 * @param {string} category - Nombre de categoría
 * @returns {Object[]}
 */
export function getTransformsByCategory(category) {
  buildCache();
  return categoryCache.get(category) || [];
}

/**
 * Obtiene todas las transformaciones registradas
 * @returns {Object[]}
 */
export function getAllTransforms() {
  buildCache();
  return Array.from(new Set(transformCache.values()));
}

/**
 * Obtiene todos los tokens estándar
 * @returns {string[]}
 */
export function getAllStandardTokens() {
  const transforms = getAllTransforms();
  return transforms
    .map(t => t.standardToken)
    .filter(Boolean)
    .sort();
}

/**
 * Busca transformaciones por nombre o descripción
 * @param {string} query - Término de búsqueda
 * @returns {Object[]}
 */
export function searchTransforms(query) {
  if (!query) return [];
  
  const lowerQuery = query.toLowerCase();
  const transforms = getAllTransforms();
  
  return transforms.filter(t => {
    return (t.type && t.type.toLowerCase().includes(lowerQuery)) ||
           (t.description && t.description.toLowerCase().includes(lowerQuery)) ||
           (t.standardToken && t.standardToken.toLowerCase().includes(lowerQuery));
  });
}

/**
 * Verifica si una transformación existe
 * @param {string} type - Tipo a verificar
 * @returns {boolean}
 */
export function hasTransform(type) {
  buildCache();
  return transformCache.has(type);
}

/**
 * Limpia el caché (útil para testing)
 */
export function clearCache() {
  transformCache.clear();
  operatorCache.clear();
  categoryCache.clear();
}

export default {
  getTransform,
  getTransformByOperator,
  getTransformsByCategory,
  getAllTransforms,
  getAllStandardTokens,
  searchTransforms,
  hasTransform,
  clearCache
};

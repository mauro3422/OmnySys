/**
 * @fileoverview Type Utilities
 * 
 * Utilidades para manipulación de tipos.
 * 
 * @module data-flow-v2/analyzers/type-inferrer/utils/type-utils
 */

/**
 * Simplifica unión de tipos
 * @param {Array} types - Tipos a unir
 * @returns {string} Unión simplificada
 */
export function simplifyUnion(types) {
  const unique = [...new Set(types)];
  
  if (unique.length === 1) return unique[0];
  if (unique.length === 2 && unique.includes('null')) {
    return `${unique.find(t => t !== 'null')}|null`;
  }
  
  return unique.join(' | ');
}

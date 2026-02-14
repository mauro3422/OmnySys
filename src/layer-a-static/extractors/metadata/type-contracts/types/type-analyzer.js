/**
 * @fileoverview Type Analyzer
 * 
 * Análisis y normalización de tipos.
 * 
 * @module type-contracts/types/type-analyzer
 * @version 1.0.0
 */

import { TYPE_KINDS, PRIMITIVE_TYPES } from './index.js';

/**
 * Analiza y clasifica un tipo
 * @param {string} type - Tipo a analizar
 * @returns {Object} Información del tipo
 */
export function analyzeType(type) {
  if (!type) {
    return { kind: TYPE_KINDS.UNKNOWN, normalized: 'any', nullable: true };
  }

  const normalized = normalizeType(type);
  
  return {
    kind: getTypeKind(normalized),
    normalized,
    baseType: extractBaseType(normalized),
    generics: extractGenerics(normalized),
    nullable: isNullableType(type),
    optional: type.endsWith('?'),
    union: isUnionType(normalized) ? splitUnion(normalized) : null
  };
}

/**
 * Normaliza un tipo
 * @param {string} type - Tipo a normalizar
 * @returns {string}
 */
export function normalizeType(type) {
  if (!type) return 'any';
  
  type = type.trim();
  
  // Opcionales
  if (type.endsWith('?')) {
    type = type.slice(0, -1);
  }
  
  // Unions
  if (type.includes('|')) {
    return type.split('|').map(t => normalizeType(t)).join(' | ');
  }
  
  // Arrays legacy T[] -> Array<T>
  if (type.endsWith('[]') && !type.includes('<')) {
    const inner = type.slice(0, -2);
    return `Array<${normalizeType(inner)}>`;
  }
  
  return type;
}

/**
 * Determina el kind de un tipo
 * @param {string} type - Tipo normalizado
 * @returns {string}
 */
function getTypeKind(type) {
  if (PRIMITIVE_TYPES.has(type)) return TYPE_KINDS.PRIMITIVE;
  if (type.startsWith('Array<') || type.endsWith('[]')) return TYPE_KINDS.ARRAY;
  if (type.startsWith('Promise<')) return TYPE_KINDS.PROMISE;
  if (type.startsWith('(') || type.includes('=>')) return TYPE_KINDS.FUNCTION;
  if (type.includes('<')) return TYPE_KINDS.GENERIC;
  if (type.includes('|')) return TYPE_KINDS.UNION;
  if (type === 'object' || type === 'Object' || type.startsWith('{')) return TYPE_KINDS.OBJECT;
  return TYPE_KINDS.OBJECT; // Default a object para clases/interfaces
}

/**
 * Extrae tipo base (sin generics)
 * @param {string} type - Tipo
 * @returns {string}
 */
function extractBaseType(type) {
  const match = type.match(/^([^<]+)/);
  return match ? match[1].trim() : type;
}

/**
 * Extrae parámetros genéricos
 * @param {string} type - Tipo
 * @returns {string[]|null}
 */
function extractGenerics(type) {
  const match = type.match(/<(.+)>/);
  if (!match) return null;
  
  // Parsear considerando anidamiento
  const inner = match[1];
  const result = [];
  let depth = 0;
  let current = '';
  
  for (const char of inner) {
    if (char === '<') depth++;
    if (char === '>') depth--;
    
    if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) result.push(current.trim());
  return result;
}

/**
 * Verifica si es tipo nullable
 * @param {string} type - Tipo
 * @returns {boolean}
 */
export function isNullableType(type) {
  if (!type) return true;
  const normalized = type.toLowerCase();
  return normalized.includes('null') || 
         normalized.includes('undefined') || 
         type.endsWith('?');
}

/**
 * Verifica si es union type
 * @param {string} type - Tipo
 * @returns {boolean}
 */
function isUnionType(type) {
  return type.includes('|');
}

/**
 * Divide un union type
 * @param {string} type - Union type
 * @returns {string[]}
 */
function splitUnion(type) {
  return type.split('|').map(t => t.trim());
}

/**
 * Extrae condición de error desde descripción
 * @param {string} description - Descripción del throw
 * @returns {string}
 */
export function extractThrowCondition(description) {
  if (!description) return 'unknown';
  
  const patterns = [
    /if\s+(.+)/i,
    /when\s+(.+)/i,
    /unless\s+(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1].trim();
  }
  
  return description;
}

export default {
  analyzeType,
  normalizeType,
  isNullableType,
  extractThrowCondition
};

/**
 * @fileoverview pattern-checkers.js
 * 
 * Verificadores de patrones comunes
 * 
 * @module validators/utils/pattern-checkers
 */

import {
  LOCALSTORAGE_METHODS,
  DOM_METHODS,
  GENERIC_PLACEHOLDERS
} from '../constants.js';

/**
 * Verifica si una string es un método de localStorage
 * @param {string} str - String a verificar
 * @returns {boolean}
 */
export function isLocalStorageMethod(str) {
  return LOCALSTORAGE_METHODS.includes(str);
}

/**
 * Verifica si una string es un método del DOM/Evento
 * @param {string} str - String a verificar
 * @returns {boolean}
 */
export function isDOMMethod(str) {
  return DOM_METHODS.includes(str);
}

/**
 * Verifica si una string es un placeholder genérico
 * @param {string} str - String a verificar
 * @returns {boolean}
 */
export function isGenericPlaceholder(str) {
  return GENERIC_PLACEHOLDERS.includes(str);
}

/**
 * Verifica si una string parece ser código JavaScript
 * @param {string} str - String a verificar
 * @returns {boolean}
 */
export function isJavaScriptCode(str) {
  return str.includes('(') || str.includes('{') || str.includes('=>');
}

/**
 * Verifica si un path es genérico/placeholder
 * @param {string} path - Path a verificar
 * @returns {boolean}
 */
export function isGenericPath(path) {
  return path === 'path/to/file.js' || path === './file.js';
}

/**
 * Verifica si un path parece válido (contiene /)
 * @param {string} path - Path a verificar
 * @returns {boolean}
 */
export function looksLikeValidPath(path) {
  return path.length > 0 && path.includes('/');
}

/**
 * Normaliza un nombre de variable global (extrae última parte si tiene .)
 * @param {string} name - Nombre a normalizar
 * @returns {string}
 */
export function normalizeGlobalName(name) {
  return name.includes('.') ? name.split('.').pop() : name;
}

/**
 * Obtiene el nombre de variable de una entrada
 * @param {object|string} entry - Entrada del LLM
 * @returns {string|null}
 */
export function extractVariableName(entry) {
  if (typeof entry === 'string') {
    return entry;
  }
  return entry?.name || entry?.variable || entry?.key || null;
}

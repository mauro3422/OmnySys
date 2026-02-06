/**
 * @fileoverview utils.js
 * 
 * Utilidades compartidas para extractores estáticos
 * 
 * @module extractors/static/utils
 */

import { NATIVE_WINDOW_PROPS } from './constants.js';

/**
 * Obtiene el número de línea para una posición en el código
 * @param {string} code - Código fuente
 * @param {number} position - Posición en el string
 * @returns {number} - Número de línea (1-based)
 */
export function getLineNumber(code, position) {
  const lines = code.substring(0, position).split('\n');
  return lines.length;
}

/**
 * Verifica si una propiedad es nativa de window/global
 * @param {string} prop - Nombre de la propiedad
 * @returns {boolean}
 */
export function isNativeWindowProp(prop) {
  return NATIVE_WINDOW_PROPS.includes(prop) || 
         prop.startsWith('on') ||  // Event handlers
         /^[A-Z]/.test(prop);      // Constructores (Array, Object, etc)
}

/**
 * Extrae matches de un patrón regex aplicado a código
 * @param {string} code - Código fuente
 * @param {RegExp} pattern - Patrón regex con flag global
 * @param {Function} transform - Función para transformar match a resultado
 * @returns {Array} - Resultados extraídos
 */
export function extractMatches(code, pattern, transform) {
  const results = [];
  let match;
  
  while ((match = pattern.exec(code)) !== null) {
    results.push(transform(match, code));
  }
  
  return results;
}

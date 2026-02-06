/**
 * @fileoverview utils.js
 * 
 * Utilidades para extracción de state management
 * 
 * @module extractors/state-management/utils
 */

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
 * Extrae paths de estado de un string (state.x.y.z)
 * @param {string} text - Texto a analizar
 * @returns {string[]} - Paths encontrados
 */
export function extractStatePaths(text) {
  const paths = [];
  const pathRegex = /(\w+(?:\.\w+)+)/g;
  let match;
  
  while ((match = pathRegex.exec(text)) !== null) {
    const fullPath = match[1];
    // Filtrar solo paths que parecen acceso a estado
    if (fullPath.includes('.') && !fullPath.startsWith('console')) {
      paths.push(fullPath);
    }
  }
  
  return paths;
}

/**
 * Trunca un string a una longitud máxima
 * @param {string} str - String a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string}
 */
export function truncate(str, maxLength = 100) {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Crea un resultado de extracción base
 * @param {string} type - Tipo de elemento
 * @param {number} line - Línea en el código
 * @param {Object} extra - Propiedades adicionales
 * @returns {Object}
 */
export function createResult(type, line, extra = {}) {
  return {
    type,
    line,
    ...extra
  };
}

/**
 * @fileoverview Native Checker - Verifica si una función es nativa
 */

const NATIVES = [
  'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number',
  'Date', 'RegExp', 'Error', 'Promise', 'Symbol', 'Map', 'Set',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI',
  'decodeURI', 'setTimeout', 'setInterval', 'clearTimeout', 
  'clearInterval', 'fetch', 'require', 'import'
];

/**
 * Verifica si es una función nativa
 * @param {string} name - Nombre de la función
 * @returns {boolean} - true si es nativa
 */
export function isNative(name) {
  return NATIVES.includes(name);
}

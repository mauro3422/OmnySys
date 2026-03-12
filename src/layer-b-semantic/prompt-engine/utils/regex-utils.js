/**
 * @fileoverview Regex utilities for prompt-engine string replacement helpers.
 *
 * @module prompt-engine/utils/regex-utils
 */

/**
 * Escapa caracteres especiales para uso en expresiones regulares.
 * @param {string} string - Texto a escapar
 * @returns {string} - Texto escapado para RegExp
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

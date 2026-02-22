/**
 * @fileoverview Call Pattern Extractor - Extrae patrones de llamadas
 */

import { isNative } from '../parsers/native-checker.js';

/**
 * Extrae patrones de llamadas a funciones
 * @param {string} sourceCode - Código fuente
 * @param {Object} atom - Información del átomo
 * @returns {Array} - Array de patrones de llamadas
 */
export function extractCallPatterns(sourceCode, atom) {
  const patterns = [];
  const callsList = atom.callGraph?.callsList || [];

  for (const call of callsList) {
    if (call.type === 'external' && !isNative(call.name)) {
      patterns.push({
        type: 'external-call',
        name: call.name,
        lines: call.lines,
        suggestion: `Mock ${call.name} para tests unitarios`
      });
    }
  }

  return patterns;
}

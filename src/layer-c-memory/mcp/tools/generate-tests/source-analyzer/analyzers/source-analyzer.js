/**
 * @fileoverview Source Analyzer - Analiza código fuente y extrae patrones
 */

import {
  extractReturnPatterns,
  extractCallPatterns,
  extractLiterals,
  extractValidations,
  extractConditions
} from '../extractors/index.js';

/**
 * Analiza el código fuente y extrae patrones de test específicos
 * @param {string} sourceCode - Código fuente
 * @param {Object} atom - Información del átomo
 * @returns {Object} - Patrones y ejemplos encontrados
 */
export function analyzeSourceForTests(sourceCode, atom) {
  if (!sourceCode) {
    return { patterns: [], examples: [] };
  }

  const patterns = [];
  const examples = [];
  const inputs = atom.dataFlow?.inputs || [];

  // Detectar retornos específicos
  const returnMatches = extractReturnPatterns(sourceCode);
  patterns.push(...returnMatches);

  // Detectar llamadas a funciones específicas
  const callPatterns = extractCallPatterns(sourceCode, atom);
  patterns.push(...callPatterns);

  // Detectar literales usados
  const literals = extractLiterals(sourceCode);
  examples.push(...literals);

  // Detectar validaciones - pasar inputs para filtrar
  const validations = extractValidations(sourceCode, inputs);
  patterns.push(...validations);

  // Detectar bucles y condiciones
  const conditions = extractConditions(sourceCode);
  patterns.push(...conditions);

  return { patterns, examples };
}

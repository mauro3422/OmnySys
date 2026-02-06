/**
 * @fileoverview response-sanitizer.js
 * 
 * Sanitización general de respuestas LLM
 * 
 * @module validators/sanitizers/response-sanitizer
 */

import { DEFAULT_REASONING, MAX_REASONING_LENGTH } from '../constants.js';

/**
 * Sanitiza el reasoning para evitar datos sensibles
 * @param {string} reasoning - Reasoning a sanitizar
 * @returns {string}
 */
export function sanitizeReasoning(reasoning) {
  if (!reasoning || typeof reasoning !== 'string') {
    return DEFAULT_REASONING;
  }

  // Limitar longitud
  return reasoning.substring(0, MAX_REASONING_LENGTH);
}

/**
 * Limita la confianza a rango válido [0, 1]
 * @param {number} confidence - Confianza a limitar
 * @returns {number}
 */
export function clampConfidence(confidence) {
  if (typeof confidence !== 'number') return 0.5;
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Sanitiza un objeto de respuesta completo
 * @param {object} response - Respuesta a sanitizar
 * @returns {object}
 */
export function sanitizeResponseObject(response) {
  if (!response || typeof response !== 'object') {
    return {
      localStorageKeys: [],
      eventNames: [],
      connectedFiles: [],
      connectionType: 'none',
      confidence: 0.5,
      reasoning: DEFAULT_REASONING
    };
  }

  return {
    ...response,
    confidence: clampConfidence(response.confidence),
    reasoning: sanitizeReasoning(response.reasoning)
  };
}

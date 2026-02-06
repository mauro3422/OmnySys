/**
 * @fileoverview timeout-calculator.js
 * 
 * Cálculo de timeouts dinámicos basados en tamaño del código
 * 
 * @module validators/utils/timeout-calculator
 */

import { TIMEOUT_CONFIG } from '../constants.js';

/**
 * Calcula timeout dinámico basado en tamaño del archivo
 * @param {string} code - Código a analizar
 * @returns {number} - Timeout en ms
 */
export function calculateDynamicTimeout(code) {
  const { baseTimeout, sizeFactor, maxTimeout } = TIMEOUT_CONFIG;
  
  const factor = Math.ceil(code.length / sizeFactor);
  
  return Math.min(baseTimeout + (factor * 1000), maxTimeout);
}

/**
 * Calcula timeout para batch de archivos
 * @param {string[]} codes - Array de códigos
 * @returns {number} - Timeout total en ms
 */
export function calculateBatchTimeout(codes) {
  if (!Array.isArray(codes) || codes.length === 0) {
    return TIMEOUT_CONFIG.baseTimeout;
  }
  
  const totalSize = codes.reduce((sum, code) => sum + (code?.length || 0), 0);
  return calculateDynamicTimeout('a'.repeat(totalSize));
}

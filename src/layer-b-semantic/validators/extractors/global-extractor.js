/**
 * @fileoverview global-extractor.js
 * 
 * Extracción de variables globales reales del código
 * 
 * @module validators/extractors/global-extractor
 */

import { GLOBAL_PATTERNS } from '../constants.js';

/**
 * Extrae variables globales reales del código (window/globalThis/global)
 * @param {string} code - Código fuente
 * @returns {Set<string>} - Set de propiedades globales detectadas
 */
export function extractActualGlobalVariables(code) {
  const globals = new Set();

  for (const pattern of GLOBAL_PATTERNS) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const prop = match[2];
      if (prop) {
        globals.add(prop);
      }
    }
  }

  return globals;
}

/**
 * Extrae solo las variables globales válidas
 * @param {string} code - Código fuente
 * @returns {string[]}
 */
export function extractValidGlobalVariables(code) {
  return Array.from(extractActualGlobalVariables(code));
}

/**
 * Verifica si una variable global existe en el código
 * @param {string} variable - Variable a buscar
 * @param {string} code - Código fuente
 * @returns {boolean}
 */
export function globalVariableExists(variable, code) {
  const actualGlobals = extractActualGlobalVariables(code);
  return actualGlobals.has(variable);
}

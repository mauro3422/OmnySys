/**
 * @fileoverview storage-extractor.js
 * 
 * Extracción de localStorage keys reales del código
 * 
 * @module validators/extractors/storage-extractor
 */

import { LOCALSTORAGE_PATTERNS } from '../constants.js';
import { isLocalStorageMethod } from '../utils/pattern-checkers.js';

/**
 * Extrae todas las localStorage keys reales del código
 * @param {string} code - Código fuente
 * @returns {Set<string>} - Set de keys únicas
 */
export function extractActualLocalStorageKeys(code) {
  const keys = new Set();

  for (const pattern of LOCALSTORAGE_PATTERNS) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const key = match[1];
      // Filtrar métodos de localStorage
      if (!isLocalStorageMethod(key)) {
        keys.add(key);
      }
    }
  }

  return keys;
}

/**
 * Extrae solo las keys que parecen válidas (no métodos)
 * @param {string} code - Código fuente
 * @returns {string[]}
 */
export function extractValidStorageKeys(code) {
  return Array.from(extractActualLocalStorageKeys(code));
}

/**
 * Verifica si una key existe en el código
 * @param {string} key - Key a buscar
 * @param {string} code - Código fuente
 * @returns {boolean}
 */
export function storageKeyExists(key, code) {
  const actualKeys = extractActualLocalStorageKeys(code);
  return actualKeys.has(key);
}

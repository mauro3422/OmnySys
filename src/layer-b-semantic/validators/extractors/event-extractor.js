/**
 * @fileoverview event-extractor.js
 * 
 * Extracción de event names reales del código
 * 
 * @module validators/extractors/event-extractor
 */

import { EVENT_PATTERNS } from '../constants.js';
import { isDOMMethod } from '../utils/pattern-checkers.js';

/**
 * Extrae todos los event names reales del código
 * @param {string} code - Código fuente
 * @returns {Set<string>} - Set de eventos únicos
 */
export function extractActualEventNames(code) {
  const events = new Set();

  for (const pattern of EVENT_PATTERNS) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const event = match[1];
      // Filtrar métodos del DOM/API
      if (!isDOMMethod(event)) {
        events.add(event);
      }
    }
  }

  return events;
}

/**
 * Extrae solo los eventos que parecen válidos (no métodos DOM)
 * @param {string} code - Código fuente
 * @returns {string[]}
 */
export function extractValidEventNames(code) {
  return Array.from(extractActualEventNames(code));
}

/**
 * Verifica si un evento existe en el código
 * @param {string} event - Evento a buscar
 * @param {string} code - Código fuente
 * @returns {boolean}
 */
export function eventNameExists(event, code) {
  const actualEvents = extractActualEventNames(code);
  return actualEvents.has(event);
}

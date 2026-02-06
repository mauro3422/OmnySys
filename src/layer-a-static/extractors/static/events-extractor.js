/**
 * @fileoverview events-extractor.js
 * 
 * Extrae nombres de eventos del código (listeners y emitters)
 * 
 * @module extractors/static/events-extractor
 */

import { EVENT_PATTERNS } from './constants.js';
import { getLineNumber } from './utils.js';

/**
 * Extrae nombres de eventos del código
 * @param {string} code - Código fuente
 * @returns {Object} - {listeners: [], emitters: [], all: []}
 */
export function extractEventNames(code) {
  const listeners = [];
  const emitters = [];
  
  // Extraer listeners
  for (const pattern of EVENT_PATTERNS.listeners) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      listeners.push({
        event: match[1],
        line: getLineNumber(code, match.index),
        type: 'listener'
      });
    }
  }
  
  // Extraer emitters (con lógica especial para dispatchEvent)
  for (const pattern of EVENT_PATTERNS.emitters) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      let eventName = match[1];
      
      // Si es dispatchEvent, buscar el tipo de evento en los parámetros
      if (match[0].includes('dispatchEvent')) {
        const extractedName = extractEventFromDispatch(code, match.index);
        if (!extractedName) continue;
        eventName = extractedName;
      }
      
      emitters.push({
        event: eventName,
        line: getLineNumber(code, match.index),
        type: 'emitter'
      });
    }
  }
  
  return {
    listeners,
    emitters,
    all: [...listeners, ...emitters]
  };
}

/**
 * Extrae el nombre del evento de un dispatchEvent buscando CustomEvent/Event
 * @param {string} code - Código fuente completo
 * @param {number} dispatchIndex - Índice donde ocurre dispatchEvent
 * @returns {string|null}
 */
function extractEventFromDispatch(code, dispatchIndex) {
  // Buscar hacia atrás y adelante para encontrar el CustomEvent/Event
  const contextStart = Math.max(0, dispatchIndex - 200);
  const contextEnd = Math.min(code.length, dispatchIndex + 200);
  const context = code.slice(contextStart, contextEnd);
  
  const customEventMatch = context.match(/new\s+(?:Custom)?Event\s*\(\s*['"]([^'"]+)['"]/);
  return customEventMatch ? customEventMatch[1] : null;
}

/**
 * Extrae solo nombres de eventos que se escuchan
 * @param {string} code - Código fuente
 * @returns {string[]} - Eventos únicos
 */
export function extractEventListeners(code) {
  const events = new Set();
  
  for (const pattern of EVENT_PATTERNS.listeners) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      events.add(match[1]);
    }
  }
  
  return Array.from(events);
}

/**
 * Extrae solo nombres de eventos que se emiten
 * @param {string} code - Código fuente
 * @returns {string[]} - Eventos únicos
 */
export function extractEventEmitters(code) {
  const events = new Set();
  const results = extractEventNames(code);
  
  for (const emitter of results.emitters) {
    events.add(emitter.event);
  }
  
  return Array.from(events);
}

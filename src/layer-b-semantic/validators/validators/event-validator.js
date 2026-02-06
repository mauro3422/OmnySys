/**
 * @fileoverview event-validator.js
 * 
 * Validación de event names del LLM
 * 
 * @module validators/validators/event-validator
 */

import { isDOMMethod, isGenericPlaceholder, isJavaScriptCode } from '../utils/pattern-checkers.js';

/**
 * Valida que los event names sean reales
 * @param {string[]} llmEvents - Eventos propuestos por el LLM
 * @param {Set<string>} actualEvents - Eventos reales extraídos del código
 * @returns {string[]} - Eventos validados
 */
export function validateEventNames(llmEvents, actualEvents) {
  if (!Array.isArray(llmEvents)) return [];
  if (!actualEvents || actualEvents.size === 0) return [];

  return llmEvents.filter(event => {
    // Rechazar métodos del DOM
    if (isDOMMethod(event)) {
      console.warn(`⚠️  LLM alucinó método DOM como evento: ${event}`);
      return false;
    }

    // Rechazar strings genéricos
    if (isGenericPlaceholder(event)) {
      console.warn(`⚠️  LLM devolvió placeholder: ${event}`);
      return false;
    }

    // Rechazar código JavaScript como evento
    if (isJavaScriptCode(event)) {
      console.warn(`⚠️  LLM confundió código con evento: ${event}`);
      return false;
    }

    return actualEvents.has(event);
  });
}

/**
 * Filtra eventos inválidos sin warnings
 * @param {string[]} events - Eventos a filtrar
 * @returns {string[]}
 */
export function filterInvalidEventNames(events) {
  if (!Array.isArray(events)) return [];
  
  return events.filter(event =>
    !isDOMMethod(event) &&
    !isGenericPlaceholder(event) &&
    !isJavaScriptCode(event)
  );
}

/**
 * Calcula score de confianza para eventos
 * @param {string[]} validatedEvents - Eventos validados
 * @param {string[]} originalEvents - Eventos originales del LLM
 * @returns {number}
 */
export function calculateEventConfidence(validatedEvents, originalEvents) {
  if (!originalEvents?.length) return 0;
  return validatedEvents.length / originalEvents.length;
}

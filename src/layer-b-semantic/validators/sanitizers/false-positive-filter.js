/**
 * @fileoverview false-positive-filter.js
 * 
 * Filtrado de falsos positivos en respuestas LLM
 * 
 * @module validators/sanitizers/false-positive-filter
 */

/**
 * Determina el tipo de conexión basado en datos validados
 * @param {string[]} localStorageKeys - Keys validadas
 * @param {string[]} eventNames - Eventos validados
 * @returns {string} - Tipo de conexión
 */
export function determineConnectionType(localStorageKeys, eventNames) {
  const hasStorage = localStorageKeys?.length > 0;
  const hasEvents = eventNames?.length > 0;

  if (hasStorage && hasEvents) {
    return 'mixed';
  } else if (hasStorage) {
    return 'localStorage';
  } else if (hasEvents) {
    return 'event';
  }
  return 'none';
}

/**
 * Verifica si la respuesta tiene contenido válido
 * @param {object} validatedResponse - Respuesta validada
 * @returns {boolean}
 */
export function hasValidContent(validatedResponse) {
  if (!validatedResponse) return false;

  const hasStorage = validatedResponse.localStorageKeys?.length > 0;
  const hasEvents = validatedResponse.eventNames?.length > 0;
  const hasFiles = validatedResponse.connectedFiles?.length > 0;

  return hasStorage || hasEvents || hasFiles;
}

/**
 * Filtra respuestas que no tienen evidencia suficiente
 * @param {object} response - Respuesta a evaluar
 * @returns {object|null} - Respuesta filtrada o null
 */
export function filterInsufficientEvidence(response) {
  if (!hasValidContent(response)) {
    return null;
  }
  return response;
}

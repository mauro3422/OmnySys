/**
 * @fileoverview entry-point-validator.js
 *
 * Validación de respuestas LLM para el arquetipo 'entry-point'
 *
 * @module validators/validators/entry-point-validator
 */

/**
 * Valida la respuesta del LLM para el arquetipo entry-point
 * @param {Object} response - Respuesta del LLM
 * @returns {Object} - {isValid, cleaned}
 */
export function validateEntryPointResponse(response) {
  if (!response || typeof response !== 'object') {
    return {
      isValid: false,
      cleaned: getDefaultEntryPointResponse()
    };
  }

  const isValid = Array.isArray(response.bootSequence);

  return {
    isValid,
    cleaned: {
      bootSequence: Array.isArray(response.bootSequence)
        ? response.bootSequence.filter(s => typeof s === 'string')
        : [],
      servicesInitialized: Array.isArray(response.servicesInitialized)
        ? response.servicesInitialized.filter(s => typeof s === 'string')
        : []
    }
  };
}

/**
 * Obtiene respuesta por defecto para entry-point
 * @returns {Object}
 */
function getDefaultEntryPointResponse() {
  return {
    bootSequence: [],
    servicesInitialized: []
  };
}

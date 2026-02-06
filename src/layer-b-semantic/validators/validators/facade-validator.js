/**
 * @fileoverview facade-validator.js
 *
 * Validación de respuestas LLM para el arquetipo 'facade'
 *
 * @module validators/validators/facade-validator
 */

/**
 * Valida la respuesta del LLM para el arquetipo facade
 * @param {Object} response - Respuesta del LLM
 * @returns {Object} - {isValid, cleaned}
 */
export function validateFacadeResponse(response) {
  if (!response || typeof response !== 'object') {
    return {
      isValid: false,
      cleaned: getDefaultFacadeResponse()
    };
  }

  const isValid = Array.isArray(response.reExportedModules);

  return {
    isValid,
    cleaned: {
      reExportedModules: Array.isArray(response.reExportedModules)
        ? response.reExportedModules.filter(m => typeof m === 'string')
        : [],
      aggregationScope: typeof response.aggregationScope === 'string'
        ? response.aggregationScope
        : 'unknown',
      blastRadius: typeof response.blastRadius === 'string'
        ? response.blastRadius
        : 'unknown'
    }
  };
}

/**
 * Obtiene respuesta por defecto para facade
 * @returns {Object}
 */
function getDefaultFacadeResponse() {
  return {
    reExportedModules: [],
    aggregationScope: 'unknown',
    blastRadius: 'unknown'
  };
}

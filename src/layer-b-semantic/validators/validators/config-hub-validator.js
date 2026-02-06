/**
 * @fileoverview config-hub-validator.js
 *
 * Validación de respuestas LLM para el arquetipo 'config-hub'
 *
 * @module validators/validators/config-hub-validator
 */

/**
 * Valida la respuesta del LLM para el arquetipo config-hub
 * @param {Object} response - Respuesta del LLM
 * @returns {Object} - {isValid, cleaned}
 */
export function validateConfigHubResponse(response) {
  if (!response || typeof response !== 'object') {
    return {
      isValid: false,
      cleaned: getDefaultConfigHubResponse()
    };
  }

  const isValid = Array.isArray(response.configKeys);

  return {
    isValid,
    cleaned: {
      configKeys: Array.isArray(response.configKeys)
        ? response.configKeys.filter(k => typeof k === 'string')
        : [],
      consumers: Array.isArray(response.consumers)
        ? response.consumers.filter(c => typeof c === 'string')
        : [],
      riskLevel: ['low', 'medium', 'high', 'critical'].includes(response.riskLevel)
        ? response.riskLevel
        : 'medium'
    }
  };
}

/**
 * Obtiene respuesta por defecto para config-hub
 * @returns {Object}
 */
function getDefaultConfigHubResponse() {
  return {
    configKeys: [],
    consumers: [],
    riskLevel: 'medium'
  };
}

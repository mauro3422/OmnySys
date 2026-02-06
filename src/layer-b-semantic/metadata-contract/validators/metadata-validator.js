/**
 * @fileoverview metadata-validator.js
 * 
 * Validación de metadatos según el contrato
 * 
 * @module metadata-contract/validators/metadata-validator
 */

import { REQUIRED_METADATA_FIELDS } from '../constants.js';

/**
 * Resultado de validación
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Si es válido
 * @property {string[]} missing - Campos faltantes
 * @property {string[]} errors - Errores de tipo
 */

/**
 * Valida que los metadatos cumplan con el contrato
 * @param {Object} metadata - Metadatos a validar
 * @returns {ValidationResult}
 */
export function validateMetadata(metadata) {
  const missing = [];
  const errors = [];

  // Verificar campos requeridos
  checkRequiredFields(metadata, missing);
  
  // Validar tipos de datos
  validateNumberTypes(metadata, errors);
  validateArrayTypes(metadata, errors);
  validateStringTypes(metadata, errors);

  return {
    valid: missing.length === 0 && errors.length === 0,
    missing,
    errors
  };
}

/**
 * Verifica campos requeridos
 * @private
 */
function checkRequiredFields(metadata, missing) {
  for (const field of REQUIRED_METADATA_FIELDS) {
    if (metadata[field] === undefined || metadata[field] === null) {
      missing.push(field);
    }
  }
}

/**
 * Valida tipos numéricos
 * @private
 */
function validateNumberTypes(metadata, errors) {
  const numberFields = ['exportCount', 'dependentCount', 'importCount', 'functionCount'];
  
  for (const field of numberFields) {
    if (metadata[field] !== undefined && typeof metadata[field] !== 'number') {
      errors.push(`${field} must be a number, got ${typeof metadata[field]}`);
    }
  }
}

/**
 * Valida tipos de arrays
 * @private
 */
function validateArrayTypes(metadata, errors) {
  const arrayFields = ['exports', 'dependents', 'localStorageKeys', 'eventNames', 'envVars'];
  
  for (const field of arrayFields) {
    if (metadata[field] !== undefined && !Array.isArray(metadata[field])) {
      errors.push(`${field} must be an array, got ${typeof metadata[field]}`);
    }
  }
}

/**
 * Valida tipos de strings
 * @private
 */
function validateStringTypes(metadata, errors) {
  if (metadata.filePath !== undefined && typeof metadata.filePath !== 'string') {
    errors.push(`filePath must be a string, got ${typeof metadata.filePath}`);
  }
}

/**
 * Valida un campo específico
 * @param {Object} metadata - Metadatos
 * @param {string} field - Campo a validar
 * @param {string} expectedType - Tipo esperado
 * @returns {string|null} - Error o null si es válido
 */
export function validateField(metadata, field, expectedType) {
  const value = metadata[field];
  
  if (value === undefined || value === null) {
    return null; // Campo opcional
  }
  
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  if (actualType !== expectedType) {
    return `${field} must be ${expectedType}, got ${actualType}`;
  }
  
  return null;
}

/**
 * Verifica si los metadatos tienen todos los campos requeridos
 * @param {Object} metadata - Metadatos
 * @returns {boolean}
 */
export function hasRequiredFields(metadata) {
  return REQUIRED_METADATA_FIELDS.every(field => 
    metadata[field] !== undefined && metadata[field] !== null
  );
}

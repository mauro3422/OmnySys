/**
 * @fileoverview storage-validator.js
 * 
 * Validación de localStorage keys del LLM
 * 
 * @module validators/validators/storage-validator
 */

import { isLocalStorageMethod, isGenericPlaceholder } from '../utils/pattern-checkers.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:storage:validator');



/**
 * Valida que las localStorage keys existan realmente en el código
 * @param {string[]} llmKeys - Keys propuestas por el LLM
 * @param {Set<string>} actualKeys - Keys reales extraídas del código
 * @returns {string[]} - Keys validadas
 */
export function validateLocalStorageKeys(llmKeys, actualKeys) {
  if (!Array.isArray(llmKeys)) return [];
  if (!actualKeys || actualKeys.size === 0) return [];

  return llmKeys.filter(key => {
    // Rechazar métodos
    if (isLocalStorageMethod(key)) {
      logger.warn(`⚠️  LLM alucinó método como key: ${key}`);
      return false;
    }

    // Rechazar strings genéricos
    if (isGenericPlaceholder(key)) {
      logger.warn(`⚠️  LLM devolvió placeholder: ${key}`);
      return false;
    }

    // Verificar que exista en el código
    return actualKeys.has(key);
  });
}

/**
 * Filtra keys inválidas sin warnings
 * @param {string[]} keys - Keys a filtrar
 * @returns {string[]}
 */
export function filterInvalidStorageKeys(keys) {
  if (!Array.isArray(keys)) return [];
  
  return keys.filter(key => 
    !isLocalStorageMethod(key) && 
    !isGenericPlaceholder(key)
  );
}

/**
 * Calcula score de confianza para storage keys
 * @param {string[]} validatedKeys - Keys validadas
 * @param {string[]} originalKeys - Keys originales del LLM
 * @returns {number}
 */
export function calculateStorageConfidence(validatedKeys, originalKeys) {
  if (!originalKeys?.length) return 0;
  return validatedKeys.length / originalKeys.length;
}

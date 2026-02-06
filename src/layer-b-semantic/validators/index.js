/**
 * @fileoverview index.js
 * 
 * Facade del módulo de validación de respuestas LLM
 * 
 * @module validators
 */

// Constantes
export {
  LOCALSTORAGE_METHODS,
  DOM_METHODS,
  GENERIC_PLACEHOLDERS,
  LOCALSTORAGE_PATTERNS,
  EVENT_PATTERNS,
  GLOBAL_PATTERNS,
  TIMEOUT_CONFIG,
  ConnectionType,
  DEFAULT_REASONING,
  MAX_REASONING_LENGTH
} from './constants.js';

// Extractores
export {
  extractActualLocalStorageKeys,
  extractValidStorageKeys,
  storageKeyExists,
  extractActualEventNames,
  extractValidEventNames,
  eventNameExists,
  extractActualGlobalVariables,
  extractValidGlobalVariables,
  globalVariableExists
} from './extractors/index.js';

// Validadores
export {
  validateLocalStorageKeys,
  filterInvalidStorageKeys,
  calculateStorageConfidence,
  validateEventNames,
  filterInvalidEventNames,
  calculateEventConfidence,
  validateConnectedFiles,
  fileExistsInProject,
  normalizeFilePath,
  sanitizeGlobalStateResponse,
  isValidGlobalVariable
} from './validators/index.js';

// Sanitizers
export {
  sanitizeReasoning,
  clampConfidence,
  sanitizeResponseObject,
  determineConnectionType,
  hasValidContent,
  filterInsufficientEvidence
} from './sanitizers/index.js';

// Utilidades
export {
  isLocalStorageMethod,
  isDOMMethod,
  isGenericPlaceholder,
  isJavaScriptCode,
  isGenericPath,
  looksLikeValidPath,
  normalizeGlobalName,
  extractVariableName,
  calculateDynamicTimeout,
  calculateBatchTimeout
} from './utils/index.js';

// Función principal de validación
import { extractActualLocalStorageKeys } from './extractors/storage-extractor.js';
import { extractActualEventNames } from './extractors/event-extractor.js';
import { validateLocalStorageKeys } from './validators/storage-validator.js';
import { validateEventNames } from './validators/event-validator.js';
import { validateConnectedFiles } from './validators/file-validator.js';
import { sanitizeGlobalStateResponse } from './validators/global-validator.js';
import { determineConnectionType, hasValidContent } from './sanitizers/false-positive-filter.js';
import { sanitizeReasoning, clampConfidence } from './sanitizers/response-sanitizer.js';
import { calculateDynamicTimeout } from './utils/timeout-calculator.js';

/**
 * Valida y sanitiza la respuesta del LLM
 * @param {object} response - Respuesta cruda del LLM
 * @param {string} code - Código fuente analizado
 * @param {Array<string>} validFilePaths - Paths válidos del proyecto
 * @returns {object|null} - Respuesta validada o null si es inválida
 */
export function validateLLMResponse(response, code, validFilePaths = []) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  // Extraer keys y eventos reales del código
  const actualLocalStorageKeys = extractActualLocalStorageKeys(code);
  const actualEventNames = extractActualEventNames(code);

  // Validar localStorageKeys
  const validatedLocalStorageKeys = validateLocalStorageKeys(
    response.localStorageKeys,
    actualLocalStorageKeys
  );

  // Validar eventNames
  const validatedEventNames = validateEventNames(
    response.eventNames,
    actualEventNames
  );

  // Validar connectedFiles
  const validatedConnectedFiles = validateConnectedFiles(
    response.connectedFiles,
    validFilePaths
  );

  // Determinar connectionType válido
  const validatedConnectionType = determineConnectionType(
    validatedLocalStorageKeys,
    validatedEventNames
  );

  // Si no hay nada válido, retornar null
  if (!hasValidContent({
    localStorageKeys: validatedLocalStorageKeys,
    eventNames: validatedEventNames,
    connectedFiles: validatedConnectedFiles
  })) {
    return null;
  }

  return {
    localStorageKeys: validatedLocalStorageKeys,
    eventNames: validatedEventNames,
    connectedFiles: validatedConnectedFiles,
    connectionType: validatedConnectionType,
    confidence: clampConfidence(response.confidence),
    reasoning: sanitizeReasoning(response.reasoning)
  };
}

// Default export
export default {
  validateLLMResponse,
  sanitizeGlobalStateResponse,
  calculateDynamicTimeout
};

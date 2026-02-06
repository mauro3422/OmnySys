/**
 * @fileoverview index.js
 * 
 * Extractors de metadatos
 * Exporta todas las funciones de extracción de metadatos
 * 
 * @module extractors/metadata
 */

// Contratos
export { extractJSDocContracts } from './jsdoc-contracts.js';
export { extractRuntimeContracts } from './runtime-contracts.js';

// Patrones
export { extractAsyncPatterns } from './async-patterns.js';
export { extractErrorHandling } from './error-handling.js';

// Build
export { extractBuildTimeDependencies } from './build-time-deps.js';

// ============================================
// Función orquestadora (API pública)
// ============================================

import { extractJSDocContracts } from './jsdoc-contracts.js';
import { extractRuntimeContracts } from './runtime-contracts.js';
import { extractAsyncPatterns } from './async-patterns.js';
import { extractErrorHandling } from './error-handling.js';
import { extractBuildTimeDependencies } from './build-time-deps.js';

/**
 * Extrae TODOS los metadatos de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Metadatos completos
 */
export function extractAllMetadata(filePath, code) {
  return {
    filePath,
    jsdoc: extractJSDocContracts(code),
    runtime: extractRuntimeContracts(code),
    async: extractAsyncPatterns(code),
    errors: extractErrorHandling(code),
    build: extractBuildTimeDependencies(code),
    timestamp: new Date().toISOString()
  };
}

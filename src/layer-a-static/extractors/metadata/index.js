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

// Advanced metadata
export { extractSideEffects } from './side-effects.js';
export { extractCallGraph } from './call-graph.js';
export { extractDataFlow } from './data-flow.js';
export { extractTypeInference } from './type-inference.js';
export { extractTemporalPatterns } from './temporal-patterns.js';
export { extractDependencyDepth } from './dependency-depth.js';
export { extractPerformanceHints } from './performance-hints.js';
export { extractHistoricalMetadata } from './historical-metadata.js';

// ============================================
// Función orquestadora (API pública)
// ============================================

import { extractJSDocContracts } from './jsdoc-contracts.js';
import { extractRuntimeContracts } from './runtime-contracts.js';
import { extractAsyncPatterns } from './async-patterns.js';
import { extractErrorHandling } from './error-handling.js';
import { extractBuildTimeDependencies } from './build-time-deps.js';
import { extractSideEffects } from './side-effects.js';
import { extractCallGraph } from './call-graph.js';
import { extractDataFlow } from './data-flow.js';
import { extractTypeInference } from './type-inference.js';
import { extractTemporalPatterns } from './temporal-patterns.js';
import { extractDependencyDepth } from './dependency-depth.js';
import { extractPerformanceHints } from './performance-hints.js';
import { extractHistoricalMetadata } from './historical-metadata.js';

/**
 * Extrae TODOS los metadatos de un archivo
 * @param {string} filePath - Ruta del archivo
 * @param {string} code - Código fuente
 * @returns {Object} - Metadatos completos
 */
export function extractAllMetadata(filePath, code) {
  return {
    filePath,
    // Existing extractors
    jsdoc: extractJSDocContracts(code),
    runtime: extractRuntimeContracts(code),
    async: extractAsyncPatterns(code),
    errors: extractErrorHandling(code),
    build: extractBuildTimeDependencies(code),
    // New extractors
    sideEffects: extractSideEffects(code),
    callGraph: extractCallGraph(code),
    dataFlow: extractDataFlow(code),
    typeInference: extractTypeInference(code),
    temporal: extractTemporalPatterns(code),
    depDepth: extractDependencyDepth(code),
    performance: extractPerformanceHints(code),
    historical: extractHistoricalMetadata(filePath),
    timestamp: new Date().toISOString()
  };
}

/**
 * @fileoverview index.js
 * 
 * Extractors de metadatos - Entry Point
 * Exporta todas las funciones de extracción de metadatos atómicos
 *
 * ARCHITECTURE: Layer A (Static Extraction)
 * Cada extractor analiza código fuente y retorna metadata específica
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Adding New Metadata Extractors
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To add a new metadata extractor:
 *
 * 1️⃣  CREATE EXTRACTOR FILE in this directory
 *     Example: security-extractor.js
 *
 *     /**
 *      * Extracts security-related metadata from code
 *      * @param {string} code - Source code to analyze
 *      * @returns {Object} Security metadata
 *      * /
 *     export function extractSecurityPatterns(code) {
 *       return {
 *         hasSQLInjection: /\.query\s*\(.*\+/.test(code),
 *         hasXSSVulnerability: /innerHTML\s*=/.test(code),
 *         confidence: 0.95
 *       };
 *     }
 *
 * 2️⃣  EXPORT from this file
 *     Add to both exports sections below
 *
 * 3️⃣  ADD TO extractAllMetadata()
 *     Include in the returned object
 *
 * ⚠️  PRINCIPLES:
 *     ✓ Pure functions: same input = same output
 *     ✓ No side effects
 *     ✓ Fast execution (use regex, avoid heavy parsing)
 *     ✓ Return structured objects with consistent types
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module extractors/metadata
 * @phase Layer A
 */

// ============================================
// Re-exports of all metadata extractors
// ============================================

// Contract extractors
export { extractJSDocContracts } from './jsdoc-contracts.js';
export { extractRuntimeContracts } from './runtime-contracts.js';

// Pattern extractors
export { extractAsyncPatterns } from './async-patterns.js';
export { extractErrorHandling } from './error-handling.js';

// Build extractors
export { extractBuildTimeDependencies } from './build-time-deps.js';

// Advanced metadata extractors
export { extractSideEffects } from './side-effects.js';
export { extractCallGraph } from './call-graph.js';
export { extractDataFlow } from './data-flow.js';
export { extractTypeInference } from './type-inference.js';
export { extractTemporalPatterns } from './temporal-patterns.js';
export { extractDependencyDepth } from './dependency-depth.js';
export { extractPerformanceHints } from './performance-hints.js';
export { extractHistoricalMetadata } from './historical-metadata.js';

// ============================================
// Orchestrator function - aggregates all metadata
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
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:index');



/**
 * Extrae TODOS los metadatos de un archivo
 * 
 * Esta función orquesta todos los extractores disponibles para crear
 * un objeto de metadata completo del archivo.
 *
 * @param {string} filePath - Ruta del archivo (para contexto/logging)
 * @param {string} code - Código fuente completo del archivo
 * @returns {Object} - Metadatos completos con todas las categorías
 * 
 * @example
 * const metadata = extractAllMetadata('src/utils.js', sourceCode);
 * logger.info(metadata.sideEffects.hasNetworkCalls); // true/false
 * logger.info(metadata.complexity.cyclomatic); // 5
 */
export function extractAllMetadata(filePath, code) {
  // Ejecutar todos los extractores
  const metadata = {
    filePath,
    
    // Contract metadata
    jsdoc: extractJSDocContracts(code),
    runtime: extractRuntimeContracts(code),
    
    // Pattern metadata
    async: extractAsyncPatterns(code),
    errors: extractErrorHandling(code),
    
    // Build metadata
    build: extractBuildTimeDependencies(code),
    
    // Advanced metadata
    sideEffects: extractSideEffects(code),
    callGraph: extractCallGraph(code),
    dataFlow: extractDataFlow(code),
    typeInference: extractTypeInference(code),
    temporal: extractTemporalPatterns(code),
    depDepth: extractDependencyDepth(code),
    performance: extractPerformanceHints(code),
    historical: extractHistoricalMetadata(filePath),
    
    // Extraction metadata
    timestamp: new Date().toISOString(),
    extractorsVersion: '1.0.0'
  };

  return metadata;
}

/**
 * Extrae metadatos de forma selectiva
 * Útil cuando solo se necesita una categoría específica
 *
 * @param {string} code - Código fuente
 * @param {Array<string>} categories - Categorías a extraer (e.g., ['sideEffects', 'performance'])
 * @returns {Object} - Solo las categorías solicitadas
 */
export function extractMetadataByCategory(code, categories) {
  const extractors = {
    jsdoc: extractJSDocContracts,
    runtime: extractRuntimeContracts,
    async: extractAsyncPatterns,
    errors: extractErrorHandling,
    build: extractBuildTimeDependencies,
    sideEffects: extractSideEffects,
    callGraph: extractCallGraph,
    dataFlow: extractDataFlow,
    typeInference: extractTypeInference,
    temporal: extractTemporalPatterns,
    depDepth: extractDependencyDepth,
    performance: extractPerformanceHints
  };

  const result = {};
  
  for (const category of categories) {
    if (extractors[category]) {
      result[category] = extractors[category](code);
    }
  }

  return result;
}

export default extractAllMetadata;

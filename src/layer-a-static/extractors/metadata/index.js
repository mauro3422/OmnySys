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
 * 2️⃣  ADD TO REGISTRY in registry.js
 *     Just add one entry to EXTRACTOR_REGISTRY array
 *
 * 3️⃣  IMPORT AND USE in extractAllMetadata() below
 *     Add import and include in the metadata object
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
// Registry - Single source of truth
// ============================================
export {
  EXTRACTOR_REGISTRY,
  getFileLevelExtractors,
  getAtomLevelExtractors,
  getExtractor,
  getAvailableFields,
  getFieldToolCoverage
} from './registry.js';

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
export { extractDataFlow } from '../data-flow/index.js';
export { extractTypeInference } from './type-inference.js';
export { extractTemporalPatterns } from './temporal-patterns.js';
export { extractDependencyDepth } from './dependency-depth.js';
export { extractPerformanceHints } from './performance-hints.js';
export { extractHistoricalMetadata } from './historical-metadata.js';

// 🆕 NUEVO: Extractores adicionales para comprehensive-extractor
export { extractDNA } from './dna-extractor.js';
export { extractErrorFlow } from './error-flow/index.js';
export { extractPerformanceMetrics } from './performance-impact/index.js';
export { extractTypeContracts } from './type-contracts/index.js';
export { extractSemanticDomain } from './semantic-domain.js';

// ============================================
// Orchestrator function - aggregates all metadata
// ============================================

import { extractJSDocContracts } from './jsdoc-contracts.js';
import { extractRuntimeContracts } from './runtime-contracts.js';
import { extractAsyncPatterns } from './async-patterns.js';
import { extractErrorHandling } from './error-handling.js';
import { extractBuildTimeDependencies } from './build-time-deps.js';
import { extractSideEffects } from './side-effects.js';
import { extractDataFlow } from '../data-flow/index.js';
import { extractTypeInference } from './type-inference.js';
import { extractTemporalPatterns } from './temporal-patterns.js';
import { extractDependencyDepth } from './dependency-depth.js';
import { extractPerformanceHints } from './performance-hints.js';
import { extractHistoricalMetadata } from './historical-metadata.js';
import { extractDNA } from './dna-extractor.js';
import { extractErrorFlow } from './error-flow/index.js';
import { extractPerformanceMetrics } from './performance-impact/index.js';
import { extractTypeContracts } from './type-contracts/index.js';
import { extractSemanticDomain } from './semantic-domain.js';
import { EXTRACTOR_REGISTRY } from './registry.js';
import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:metadata-extractors');

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
    dataFlow: extractDataFlow(code, { filePath }),
    typeInference: extractTypeInference(code),
    temporal: extractTemporalPatterns(code),
    depDepth: extractDependencyDepth(code),
    performance: extractPerformanceHints(code),
    historical: extractHistoricalMetadata(filePath),

    // 🆕 NUEVO: Extractores adicionales para maximizar metadata
    dna: extractDNA(code),
    errorFlow: extractErrorFlow(code),
    performanceMetrics: extractPerformanceMetrics(code),
    typeContracts: extractTypeContracts(code),
    semanticDomain: extractSemanticDomain(code, '', filePath),

    // Extraction metadata - usar el registry para contar
    timestamp: new Date().toISOString(),
    extractorsVersion: '2.1.0',
    extractorCount: EXTRACTOR_REGISTRY.length
  };

  return metadata;
}

/**
 * Extrae metadata para un átomo específico (función individual)
 * Llama a los extractores de nivel 'atom' con el código de la función
 *
 * @param {string} filePath - Ruta del archivo
 * @param {string} functionName - Nombre de la función
 * @param {string} functionCode - Código fuente de la función
 * @returns {Object} - Metadata específica del átomo
 */
export function extractAtomMetadata(filePath, functionName, functionCode) {
  const metadata = {};

  const code = typeof functionCode === 'string' ? functionCode : '';
  const name = typeof functionName === 'string' ? functionName : '';
  const path = typeof filePath === 'string' ? filePath : '';

  metadata.semanticDomain = extractSemanticDomain(code, name, path);
  metadata.performance = extractPerformanceHints(code);

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

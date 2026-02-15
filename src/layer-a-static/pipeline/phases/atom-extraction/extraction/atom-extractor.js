/**
 * @fileoverview atom-extractor.js
 *
 * Atom extraction logic for individual and batch atom processing
 *
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor
 */

import { extractFunctionCode } from '#shared/utils/ast-utils.js';
import { extractSideEffects } from '#layer-a/extractors/metadata/side-effects.js';
import { extractCallGraph } from '#layer-a/extractors/metadata/call-graph.js';
import { extractDataFlow as extractDataFlowV2 } from '#layer-a/extractors/data-flow/index.js';
import { extractTemporalPatterns } from '#layer-a/extractors/metadata/temporal-patterns.js';
import { extractTemporalPatterns as extractTemporalConnections } from '#layer-a/extractors/metadata/temporal-connections.js';
import { extractPerformanceHints } from '#layer-a/extractors/metadata/performance-hints.js';
import { extractPerformanceMetrics } from '#layer-a/extractors/metadata/performance-impact.js';
import { extractTypeContracts } from '#layer-a/extractors/metadata/type-contracts.js';
import { extractErrorFlow } from '#layer-a/extractors/metadata/error-flow.js';
import { logger } from '#utils/logger.js';
import { calculateComplexity } from '../metadata/complexity.js';
import { detectAtomArchetype } from '../metadata/archetype.js';
import { buildAtomMetadata } from '../builders/metadata-builder.js';
import { enrichWithDNA } from '../builders/enrichment.js';

/**
 * Extract metadata for all atoms from file info
 * @param {Object} fileInfo - Parsed file info with functions
 * @param {string} code - Source code
 * @param {Object} fileMetadata - File-level metadata
 * @param {string} filePath - File path
 * @returns {Promise<Array>} - Array of atom metadata
 */
export async function extractAtoms(fileInfo, code, fileMetadata, filePath) {
  return Promise.all(
    (fileInfo.functions || []).map(async (functionInfo) => {
      const functionCode = extractFunctionCode(code, functionInfo);
      return extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath);
    })
  );
}

/**
 * Extract metadata for a single atom
 * @param {Object} functionInfo - Function info from parser
 * @param {string} functionCode - Extracted function source code
 * @param {Object} fileMetadata - File-level metadata
 * @param {string} filePath - File path
 * @returns {Promise<Object>} - Atom metadata
 */
export async function extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath) {
  // Extract various metadata aspects
  const sideEffects = extractSideEffects(functionCode);
  const callGraph = extractCallGraph(functionCode);
  const temporal = extractTemporalPatterns(functionCode);
  const performanceHints = extractPerformanceHints(functionCode);

  // Enriched connection systems
  const performanceMetrics = extractPerformanceMetrics(functionCode, performanceHints);
  const typeContracts = extractTypeContracts(functionCode, fileMetadata.jsdoc, functionInfo);
  const errorFlow = extractErrorFlow(functionCode, typeContracts);
  const temporalPatterns = extractTemporalConnections(functionCode, functionInfo);

  // Data flow analysis (optional, may fail gracefully)
  const dataFlowV2 = await extractDataFlowSafe(functionInfo, functionCode, filePath);

  // Calculate metrics
  const complexity = calculateComplexity(functionCode);
  const linesOfCode = functionCode.split('\n').length;

  // Build atom metadata
  const atomMetadata = buildAtomMetadata({
    functionInfo,
    filePath,
    linesOfCode,
    complexity,
    sideEffects,
    callGraph,
    temporal,
    temporalPatterns,
    typeContracts,
    errorFlow,
    performanceHints,
    performanceMetrics,
    dataFlowV2,
    functionCode
  });

  // Post-process with DNA and lineage
  enrichWithDNA(atomMetadata, functionInfo.name);

  // Detect archetype
  atomMetadata.archetype = detectAtomArchetype(atomMetadata);

  return atomMetadata;
}

/**
 * Extract data flow with error handling
 * @private
 */
async function extractDataFlowSafe(functionInfo, functionCode, filePath) {
  try {
    const functionAst = functionInfo.node || functionInfo.ast;
    if (functionAst) {
      return await extractDataFlowV2(
        functionAst,
        functionCode,
        functionInfo.name,
        filePath
      );
    }
  } catch (error) {
    logger.warn(`Data flow extraction failed for ${functionInfo.name}: ${error.message}`);
  }
  return null;
}

export default { extractAtoms, extractAtomMetadata };

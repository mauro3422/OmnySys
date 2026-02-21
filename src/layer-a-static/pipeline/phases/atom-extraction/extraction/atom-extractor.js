/**
 * @fileoverview atom-extractor.js
 *
 * Atom extraction logic for individual and batch atom processing
 *
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor
 */

import { extractFunctionCode } from '#shared/utils/ast-utils.js';
import { extractDataFlow as extractDataFlowV2 } from '#layer-a/extractors/data-flow/index.js';
import { getAtomLevelExtractors } from '#layer-a/extractors/metadata/registry.js';
import { logger } from '#utils/logger.js';
import { calculateComplexity } from '../metadata/complexity.js';
import { detectAtomArchetype } from '../metadata/archetype.js';
import { detectAtomPurpose } from '../metadata/purpose.js';
import { buildAtomMetadata } from '../builders/metadata-builder.js';
import { enrichWithDNA } from '../builders/enrichment.js';

// Base URL for dynamic imports of atom-level extractors
// atom-extractor.js lives in: src/layer-a-static/pipeline/phases/atom-extraction/extraction/
// extractors live in:         src/layer-a-static/extractors/metadata/
// → 4 levels up from extraction/ to reach layer-a-static/
const EXTRACTORS_BASE = new URL('../../../../extractors/metadata/', import.meta.url).href;

/**
 * Cache of dynamically imported extractor functions.
 * Populated once on first call, reused for all subsequent atoms.
 * @type {Map<string, Function>}
 */
const _extractorCache = new Map();

/**
 * Extract metadata for all atoms from file info
 * @param {Object} fileInfo - Parsed file info with functions
 * @param {string} code - Source code
 * @param {Object} fileMetadata - File-level metadata
 * @param {string} filePath - File path
 * @returns {Promise<Array>} - Array of atom metadata
 */
export async function extractAtoms(fileInfo, code, fileMetadata, filePath) {
  const atoms = [];
  
  // Get file-level imports
  const fileImports = fileInfo.imports || [];
  
  // Process functions (existing)
  const functionAtoms = await Promise.all(
    (fileInfo.functions || []).map(async (functionInfo) => {
      const functionCode = extractFunctionCode(code, functionInfo);
      return extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath, fileImports);
    })
  );
  atoms.push(...functionAtoms);
  
  // Process constantExports (v0.9.34 - new)
  const constantAtoms = (fileInfo.constantExports || []).map(constInfo => {
    return buildVariableAtom(constInfo, filePath, 'constant', fileImports);
  });
  atoms.push(...constantAtoms);
  
  // Process objectExports as config atoms (v0.9.34 - new)
  const objectAtoms = (fileInfo.objectExports || []).map(objInfo => {
    return buildVariableAtom(objInfo, filePath, 'config', fileImports);
  });
  atoms.push(...objectAtoms);
  
  return atoms;
}

/**
 * Build an atom for a variable/constant export
 * @param {Object} varInfo - Variable info from parser
 * @param {string} filePath - File path
 * @param {string} varType - 'constant' or 'config'
 * @param {Array} imports - File-level imports
 * @returns {Object} - Atom metadata
 */
function buildVariableAtom(varInfo, filePath, varType = 'constant', imports = []) {
  const name = varInfo.name;
  const line = varInfo.line || 0;
  
  return {
    id: `${filePath}::${name}`,
    name,
    type: 'variable',
    filePath,
    line,
    endLine: line,
    linesOfCode: 1,
    
    // Variable-specific
    kind: 'const',
    valueType: varType === 'config' ? 'object' : (varInfo.valueType || 'unknown'),
    valueProperties: varInfo.properties || varInfo.propertyDetails || [],
    isSignificant: varType === 'config',
    
    // Export status
    isExported: true,
    
    // Metadata estándar
    complexity: 1,
    hasSideEffects: false,
    hasNetworkCalls: false,
    hasDomManipulation: false,
    hasStorageAccess: false,
    hasLogging: false,
    networkEndpoints: [],
    
    // Calls
    calls: [],
    internalCalls: [],
    externalCalls: [],
    externalCallCount: 0,
    
    // Compatibilidad
    className: null,
    functionType: 'variable',
    isAsync: false,
    hasErrorHandling: false,
    hasNestedLoops: false,
    hasBlockingOps: false,
    
    // Temporal
    hasLifecycleHooks: false,
    lifecycleHooks: [],
    hasCleanupPatterns: false,
    temporal: {
      patterns: { timers: [], asyncPatterns: null, events: [], lifecycleHooks: [], executionOrder: { mustRunBefore: [], mustRunAfter: [], canRunInParallel: [] } },
      executionOrder: null
    },
    
    // TypeContracts
    typeContracts: {
      params: [],
      returns: null,
      throws: [],
      generics: [],
      signature: `const ${name}: ${varType}`,
      confidence: 0.8
    },
    
    // Error flow
    errorFlow: { throws: [], catches: [], tryBlocks: [], unhandledCalls: [], propagation: 'none' },
    
    // Performance
    performance: {
      complexity: { cyclomatic: 1, cognitive: 0, bigO: 'O(1)' },
      expensiveOps: { nestedLoops: 0, recursion: false, blockingOps: [], heavyCalls: [] },
      resources: { network: false, disk: false, memory: 'low', dom: false },
      estimates: { executionTime: 'instant', blocking: false, async: false, expensiveWithCache: false },
      impactScore: 0
    },
    
    // Data flow
    dataFlow: {
      graph: { nodes: [], edges: [], meta: { totalNodes: 0, totalEdges: 0 } },
      inputs: [],
      transformations: [],
      outputs: [{ type: 'variable', name, valueType: varType, line }],
      analysis: { invariants: [], inferredTypes: {} },
      _meta: { extractedAt: new Date().toISOString(), version: '1.0.0' }
    },
    hasDataFlow: true,
    dataFlowAnalysis: { invariants: [], inferredTypes: {} },
    
    // DNA
    dna: {
      structuralHash: `var-${name}-${line}`,
      patternHash: varType,
      flowType: 'data',
      operationSequence: ['declare'],
      complexityScore: 1,
      inputCount: 0,
      outputCount: 1,
      transformationCount: 0,
      semanticFingerprint: 'variable',
      extractedAt: new Date().toISOString(),
      version: '1.0',
      id: `var-${name}`
    },
    
    lineage: null,
    extractedAt: new Date().toISOString(),
    
    _meta: {
      dataFlowVersion: '1.0.0-fractal',
      extractionTime: new Date().toISOString(),
      confidence: 0.7
    },
    
    // Archetype
    archetype: {
      type: varType === 'config' ? 'config' : 'constant',
      severity: varInfo.riskLevel === 'high' ? 3 : (varInfo.riskLevel === 'medium' ? 2 : 1),
      confidence: 1
    },
    
    // Purpose (v0.9.36 - NEW)
    purpose: 'API_EXPORT',
    purposeReason: 'Exported variable/constant (public API)',
    purposeConfidence: 1.0,
    isDeadCode: false,
    
    // calledBy se poblará en cross-file linkage
    calledBy: [],

    // File-level imports (available to this atom)
    imports: imports.map(imp => ({
      source: imp.source || imp.module,
      type: imp.type,
      specifiers: imp.names || imp.specifiers || [],
      line: imp.line
    })),

    // Derived scores (consistent with function atoms)
    derived: {
      fragilityScore: 0,
      testabilityScore: 1,
      couplingScore: 0,
      changeRisk: varInfo.riskLevel === 'high' ? 0.4 : (varInfo.riskLevel === 'medium' ? 0.2 : 0.1)
    }
  };
}

/**
 * Load an extractor function from the registry, with caching.
 * @param {Object} entry - Registry entry
 * @returns {Promise<Function>}
 */
async function loadExtractor(entry) {
  if (_extractorCache.has(entry.name)) {
    return _extractorCache.get(entry.name);
  }
  const url = new URL(entry.file, EXTRACTORS_BASE).href;
  const mod = await import(url);
  const fn = mod[entry.function];
  if (typeof fn !== 'function') {
    throw new Error(`Extractor "${entry.name}" export "${entry.function}" is not a function in ${url}`);
  }
  _extractorCache.set(entry.name, fn);
  return fn;
}

/**
 * Run all registered atom-level extractors in order.
 * Each extractor's result is stored in results[entry.name] and available
 * to subsequent extractors via ctx.results.
 * @param {Object} ctx - { functionCode, functionInfo, fileMetadata, filePath }
 * @returns {Promise<Object>} - Map of extractor name → result
 */
async function runAtomExtractors(ctx) {
  const results = {};
  ctx.results = results;

  for (const entry of getAtomLevelExtractors()) {
    try {
      const fn = await loadExtractor(entry);
      const args = entry.getArgs(ctx);
      results[entry.name] = fn(...args);
    } catch (err) {
      logger.warn(`Extractor "${entry.name}" failed: ${err.message}`);
      results[entry.name] = null;
    }
  }

  return results;
}

/**
 * Extract metadata for a single atom
 * @param {Object} functionInfo - Function info from parser
 * @param {string} functionCode - Extracted function source code
 * @param {Object} fileMetadata - File-level metadata
 * @param {string} filePath - File path
 * @param {Array} imports - File-level imports
 * @returns {Promise<Object>} - Atom metadata
 */
export async function extractAtomMetadata(functionInfo, functionCode, fileMetadata, filePath, imports = []) {
  // Run all registered atom-level extractors
  const extractorResults = await runAtomExtractors({ functionCode, functionInfo, fileMetadata, filePath });

  // Data flow analysis (optional, may fail gracefully) — kept separate because it's async + uses AST node
  const dataFlowV2 = await extractDataFlowSafe(functionInfo, functionCode, filePath);

  // Calculate metrics
  const complexity = calculateComplexity(functionCode);
  const linesOfCode = functionCode.split('\n').length;

  // Build atom metadata — spreads extractorResults so metadata-builder can destructure what it needs
  const atomMetadata = buildAtomMetadata({
    functionInfo,
    filePath,
    linesOfCode,
    complexity,
    dataFlowV2,
    functionCode,
    imports,
    ...extractorResults
  });

  // Post-process with DNA and lineage
  enrichWithDNA(atomMetadata, functionInfo.name);

  // Detect archetype
  atomMetadata.archetype = detectAtomArchetype(atomMetadata);

  // Detect purpose (v0.9.36 - NEW)
  const purposeInfo = detectAtomPurpose(atomMetadata, filePath);
  atomMetadata.purpose = purposeInfo.purpose;
  atomMetadata.purposeReason = purposeInfo.purposeReason;
  atomMetadata.purposeConfidence = purposeInfo.purposeConfidence;
  atomMetadata.isDeadCode = purposeInfo.isDeadCode;

  return atomMetadata;
}

/**
 * Extract data flow with error handling
 * @private
 */
async function extractDataFlowSafe(functionInfo, functionCode, filePath) {
  try {
    // Prefer the already-parsed AST node to avoid re-parsing (fixes class methods)
    const input = functionInfo.node || functionCode;
    if (input) {
      return await extractDataFlowV2(
        input,
        { functionName: functionInfo.name, inferTypes: true }
      );
    }
  } catch (error) {
    logger.warn(`Data flow extraction failed for ${functionInfo.name}: ${error.message}`);
  }
  return null;
}

export default { extractAtoms, extractAtomMetadata };

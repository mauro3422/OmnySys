/**
 * @fileoverview metadata-builder.js
 *
 * Builds atom metadata object from extracted information
 *
 * @module pipeline/phases/atom-extraction/builders/metadata-builder
 */

/**
 * Build atom metadata object
 * @param {Object} params - Build parameters
 * @returns {Object} - Complete atom metadata
 */
export function buildAtomMetadata({
  functionInfo,
  filePath,
  linesOfCode,
  complexity,
  // Extractor results (names match EXTRACTOR_REGISTRY entries)
  sideEffects,
  callGraph,
  temporal,
  temporalPatterns,
  typeContracts,
  errorFlow,
  performanceHints,
  performanceMetrics,
  semanticDomain,
  // Data flow (kept separate — async + AST-based)
  dataFlowV2,
  functionCode,
  imports = []
}) {
  // Normalize extractor results — guard against null/undefined when an extractor fails gracefully
  const se = sideEffects || { all: [], networkCalls: [], domManipulations: [], storageAccess: [], consoleUsage: [] };
  const cg = callGraph || { internalCalls: [], externalCalls: [] };
  const tmp = temporal || { lifecycleHooks: [], cleanupPatterns: [] };
  const ph = performanceHints || { nestedLoops: [], blockingOperations: [] };

  return {
    // Identity — use relative filePath (already normalized) to avoid absolute-path IDs
    id: `${filePath}::${functionInfo.fullName || functionInfo.name}`,
    name: functionInfo.name,
    type: 'atom',
    filePath: filePath,
    line: functionInfo.line,
    endLine: functionInfo.endLine,
    linesOfCode,

    // Export status
    isExported: functionInfo.isExported,

    // Class membership
    className: functionInfo.className || null,
    functionType: functionInfo.type || 'declaration',

    // Test callback identity (set by extractTestCallback in definitions.js)
    isTestCallback: functionInfo.isTestCallback || false,
    testCallbackType: functionInfo.testCallbackType || null,

    // Complexity
    complexity,

    // Side effects — combina regex extractor + dataFlow AST outputs (más preciso)
    hasSideEffects: se.all.length > 0 ||
      (dataFlowV2?.outputs || dataFlowV2?.real?.outputs || []).some(
        o => o.type === 'side_effect' || o.isSideEffect === true
      ),
    hasNetworkCalls: se.networkCalls.length > 0,
    hasDomManipulation: se.domManipulations.length > 0,
    hasStorageAccess: se.storageAccess.length > 0,
    hasLogging: se.consoleUsage.length > 0,
    networkEndpoints: se.networkCalls.map(c => c.url || c.endpoint).filter(Boolean),

    // Call graph (v0.9.34 - unified calls from all sources)
    internalCalls: cg.internalCalls || [],
    externalCalls: cg.externalCalls || [],
    externalCallCount: (cg.externalCalls || []).length,
    // Unified calls: combine functionInfo.calls with callGraph results
    calls: [
      ...(functionInfo.calls || []),
      ...(cg.internalCalls || []).map(c => ({
        name: c.name || c.callee,
        type: c.type || 'internal',
        line: c.line
      })),
      ...(cg.externalCalls || []).map(c => ({
        name: c.name || c.callee,
        type: 'external',
        line: c.line
      }))
    ].filter((call, index, self) =>
      // Deduplicate by name+line
      index === self.findIndex(c => c.name === call.name && c.line === call.line)
    ),

    // Error handling
    hasErrorHandling: /try\s*\{/.test(functionCode) || /if\s*\(.*\)\s*throw/.test(functionCode),

    // Async
    isAsync: functionInfo.isAsync || /async\s+function/.test(functionCode) || /await\s+/.test(functionCode),

    // Temporal
    hasLifecycleHooks: tmp.lifecycleHooks.length > 0,
    lifecycleHooks: tmp.lifecycleHooks,
    hasCleanupPatterns: tmp.cleanupPatterns.length > 0,

    // Temporal Connections
    temporal: {
      patterns: temporalPatterns,
      executionOrder: temporalPatterns?.executionOrder || null
    },

    // Type Contracts
    typeContracts: typeContracts,

    // Error Flow
    errorFlow: errorFlow,

    // Performance
    hasNestedLoops: ph.nestedLoops.length > 0,
    hasBlockingOps: ph.blockingOperations.length > 0,
    performance: performanceMetrics,

    // Data Flow Fractal
    dataFlow: dataFlowV2?.real || dataFlowV2 || null,
    dataFlowAnalysis: dataFlowV2?.analysis || null,
    hasDataFlow: dataFlowV2 !== null && (dataFlowV2.inputs?.length > 0 || dataFlowV2.real?.inputs?.length > 0),

    // Derived scores — computed purely from existing metadata (no LLM needed)
    derived: {
      // 0-1: probabilidad de romper si se modifica este átomo
      fragilityScore: computeFragilityScore(complexity, cg, errorFlow, ph),
      // 0-1: qué tan fácil es escribir un test unitario para este átomo
      testabilityScore: computeTestabilityScore(complexity, se, ph, functionInfo),
      // coupling: cuántas conexiones tiene (no normalizado — valor absoluto)
      couplingScore: (cg.externalCalls?.length || 0) + (cg.internalCalls?.length || 0),
      // changeRisk: base desde complexity + isExported; se recalcula con calledBy en cross-file pass
      changeRisk: computeBaseChangeRisk(complexity, functionInfo.isExported)
    },

    // Semantic Domain (v2.1.0 - NEW)
    semanticDomain: semanticDomain || null,

    // DNA & Lineage
    dna: null,
    lineage: null,

    // File-level imports (available to this atom)
    imports: imports.map(imp => ({
      source: imp.source || imp.module,
      type: imp.type,
      specifiers: imp.names || imp.specifiers || [],
      line: imp.line
    })),

    // Metadata
    extractedAt: new Date().toISOString(),
    _meta: {
      dataFlowVersion: '1.0.0-fractal',
      extractionTime: new Date().toISOString(),
      confidence: dataFlowV2?.analysis?.coherence ? dataFlowV2.analysis.coherence / 100 : 0.5
    }
  };
}

/**
 * Fragility: probabilidad de romper si se modifica.
 * Factores: complejidad, loops anidados, error propagation parcial, operaciones bloqueantes.
 */
function computeFragilityScore(complexity, callGraph, errorFlow, performanceHints) {
  let score = 0;
  score += Math.min(0.4, complexity / 100);                            // complejidad (max 0.4)
  score += (performanceHints?.nestedLoops?.length > 0) ? 0.2 : 0;    // nested loops
  score += (errorFlow?.propagation === 'partial') ? 0.2 : 0;          // error handling parcial
  score += (performanceHints?.blockingOperations?.length > 0) ? 0.1 : 0; // blocking
  score += Math.min(0.1, (callGraph?.externalCalls?.length || 0) / 20); // acoplamiento externo
  return Math.round(Math.min(1, score) * 100) / 100;
}

/**
 * Testability: qué tan fácil es testear este átomo.
 * Alta complejidad, side effects, async, y muchos parámetros reducen la testeabilidad.
 */
function computeTestabilityScore(complexity, sideEffects, performanceHints, functionInfo) {
  let score = 1;
  score -= Math.min(0.4, complexity / 80);                            // complejidad baja el score
  score -= (sideEffects?.all?.length > 0) ? 0.2 : 0;                 // side effects
  score -= (performanceHints?.nestedLoops?.length > 0) ? 0.15 : 0;   // nested loops
  score -= (functionInfo?.isAsync) ? 0.1 : 0;                        // async adds complexity
  score -= Math.min(0.15, ((functionInfo?.params?.length || 0) / 10)); // muchos params
  return Math.round(Math.max(0, score) * 100) / 100;
}

/**
 * changeRisk base (sin calledBy aún). Se sobreescribe en el cross-file pass.
 */
function computeBaseChangeRisk(complexity, isExported) {
  const exportRisk = isExported ? 0.2 : 0;
  const complexityRisk = Math.min(0.3, complexity / 100);
  return Math.round((exportRisk + complexityRisk) * 100) / 100;
}

export default buildAtomMetadata;

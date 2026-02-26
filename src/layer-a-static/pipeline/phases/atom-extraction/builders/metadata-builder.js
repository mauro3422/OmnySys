/**
 * @fileoverview metadata-builder.js
 *
 * Builds atom metadata object from extracted information
 *
 * @module pipeline/phases/atom-extraction/builders/metadata-builder
 */

import { determineScopeType } from '../../../../extractors/metadata/tree-sitter-integration.js';

// ── Section builders ──────────────────────────────────────────────────────────

function buildSideEffectFields(se, dataFlowV2) {
  const dfOutputs = dataFlowV2?.outputs || dataFlowV2?.real?.outputs || [];
  return {
    hasSideEffects: se.all.length > 0 || dfOutputs.some(o => o.type === 'side_effect' || o.isSideEffect === true),
    hasNetworkCalls: se.networkCalls.length > 0,
    hasDomManipulation: se.domManipulations.length > 0,
    hasStorageAccess: se.storageAccess.length > 0,
    hasLogging: se.consoleUsage.length > 0,
    networkEndpoints: se.networkCalls.map(c => c.url || c.endpoint).filter(Boolean)
  };
}

function buildCallFields(functionInfo, cg) {
  const unified = [
    ...(functionInfo.calls || []),
    ...(cg.internalCalls || []).map(c => ({ name: c.name || c.callee, type: c.type || 'internal', line: c.line })),
    ...(cg.externalCalls || []).map(c => ({ name: c.name || c.callee, type: 'external', line: c.line }))
  ].filter((call, i, self) => i === self.findIndex(c => c.name === call.name && c.line === call.line));

  return {
    internalCalls: cg.internalCalls || [],
    externalCalls: cg.externalCalls || [],
    externalCallCount: (cg.externalCalls || []).length,
    calls: unified
  };
}

function buildDataFlowFields(dataFlowV2) {
  return {
    dataFlow: dataFlowV2?.real || dataFlowV2 || null,
    dataFlowAnalysis: dataFlowV2?.analysis || null,
    hasDataFlow: dataFlowV2 !== null &&
      (dataFlowV2.inputs?.length > 0 || dataFlowV2.real?.inputs?.length > 0)
  };
}

function buildImports(imports) {
  return imports.map(imp => ({
    source: imp.source || imp.module,
    type: imp.type,
    specifiers: imp.names || imp.specifiers || [],
    line: imp.line
  }));
}

function buildMeta(dataFlowV2) {
  return {
    dataFlowVersion: '1.0.0-fractal',
    extractionTime: new Date().toISOString(),
    confidence: dataFlowV2?.analysis?.coherence ? dataFlowV2.analysis.coherence / 100 : 0.5
  };
}

function buildDerivedScores(complexity, cg, se, errorFlow, ph, functionInfo) {
  return {
    fragilityScore: computeFragilityScore(complexity, cg, errorFlow, ph),
    testabilityScore: computeTestabilityScore(complexity, se, ph, functionInfo),
    couplingScore: (cg.externalCalls?.length || 0) + (cg.internalCalls?.length || 0),
    changeRisk: computeBaseChangeRisk(complexity, functionInfo.isExported)
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

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
  sideEffects,
  callGraph,
  temporal,
  temporalPatterns,
  typeContracts,
  errorFlow,
  performanceHints,
  performanceMetrics,
  semanticDomain,
  dataFlowV2,
  functionCode,
  imports = [],
  treeSitter = null // NEW: Tree-sitter metadata
}) {
  // Normalize extractor results — guard against null/undefined when an extractor fails gracefully
  const se = sideEffects || { all: [], networkCalls: [], domManipulations: [], storageAccess: [], consoleUsage: [] };
  const cg = callGraph || { internalCalls: [], externalCalls: [] };
  const tmp = temporal || { lifecycleHooks: [], cleanupPatterns: [] };
  const ph = performanceHints || { nestedLoops: [], blockingOperations: [] };

  return {
    // Identity
    id: `${filePath}::${functionInfo.fullName || functionInfo.name}`,
    name: functionInfo.name,
    type: 'atom',
    filePath,
    line: functionInfo.line,
    endLine: functionInfo.endLine,
    linesOfCode,

    // Export & class
    isExported: functionInfo.isExported,
    className: functionInfo.className || null,
    functionType: functionInfo.type || 'declaration',

    // Test callback identity
    isTestCallback: functionInfo.isTestCallback || false,
    testCallbackType: functionInfo.testCallbackType || null,

    // Complexity
    complexity,

    // Side effects
    ...buildSideEffectFields(se, dataFlowV2),

    // Call graph
    ...buildCallFields(functionInfo, cg),

    // Code patterns - Error handling detection
    hasErrorHandling: (functionCode || '').includes('try') ||
      (functionCode || '').includes('catch'),
    isAsync: functionInfo.isAsync || /async\s+function/.test(functionCode) || /await\s+/.test(functionCode),

    // Temporal
    hasLifecycleHooks: tmp.lifecycleHooks.length > 0,
    lifecycleHooks: tmp.lifecycleHooks,
    hasCleanupPatterns: tmp.cleanupPatterns.length > 0,
    temporal: { patterns: temporalPatterns, executionOrder: temporalPatterns?.executionOrder || null },

    // Contracts & flow
    typeContracts,
    errorFlow,

    // Performance
    hasNestedLoops: ph.nestedLoops.length > 0,
    hasBlockingOps: ph.blockingOperations.length > 0,
    performance: performanceMetrics,

    // Data flow
    ...buildDataFlowFields(dataFlowV2),

    // Derived scores
    derived: buildDerivedScores(complexity, cg, se, errorFlow, ph, functionInfo),

    // Semantic
    semanticDomain: semanticDomain || null,

    // Tree-sitter metadata (shared state, events, scope)
    sharedStateAccess: treeSitter?.sharedStateAccess || [],
    eventEmitters: treeSitter?.eventEmitters || [],
    eventListeners: treeSitter?.eventListeners || [],
    scopeType: treeSitter?.sharedStateAccess?.length > 0 
      ? determineScopeType(treeSitter.sharedStateAccess[0])
      : null,

    // DNA & Lineage (set later)
    dna: null,
    lineage: null,

    // Imports
    imports: buildImports(imports),

    // Metadata
    extractedAt: new Date().toISOString(),
    _meta: {
      ...buildMeta(dataFlowV2),
      identifierRefs: functionInfo.identifierRefs || []
    }
  };
}

// ── Score helpers ─────────────────────────────────────────────────────────────

function computeFragilityScore(complexity, callGraph, errorFlow, performanceHints) {
  let score = 0;
  score += Math.min(0.4, complexity / 100);
  score += (performanceHints?.nestedLoops?.length > 0) ? 0.2 : 0;
  score += (errorFlow?.propagation === 'partial') ? 0.2 : 0;
  score += (performanceHints?.blockingOperations?.length > 0) ? 0.1 : 0;
  score += Math.min(0.1, (callGraph?.externalCalls?.length || 0) / 20);
  return Math.round(Math.min(1, score) * 100) / 100;
}

function computeTestabilityScore(complexity, sideEffects, performanceHints, functionInfo) {
  let score = 1;
  score -= Math.min(0.4, complexity / 80);
  score -= (sideEffects?.all?.length > 0) ? 0.2 : 0;
  score -= (performanceHints?.nestedLoops?.length > 0) ? 0.15 : 0;
  score -= (functionInfo?.isAsync) ? 0.1 : 0;
  score -= Math.min(0.15, (functionInfo?.params?.length || 0) / 10);
  return Math.round(Math.max(0, score) * 100) / 100;
}

function computeBaseChangeRisk(complexity, isExported) {
  return Math.round((
    (isExported ? 0.2 : 0) +
    Math.min(0.3, complexity / 100)
  ) * 100) / 100;
}

export default buildAtomMetadata;

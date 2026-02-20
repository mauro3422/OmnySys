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
}) {
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

    // Complexity
    complexity,

    // Side effects
    hasSideEffects: sideEffects.all.length > 0,
    hasNetworkCalls: sideEffects.networkCalls.length > 0,
    hasDomManipulation: sideEffects.domManipulations.length > 0,
    hasStorageAccess: sideEffects.storageAccess.length > 0,
    hasLogging: sideEffects.consoleUsage.length > 0,
    networkEndpoints: sideEffects.networkCalls.map(c => c.url || c.endpoint).filter(Boolean),

    // Call graph (v0.9.34 - unified calls from all sources)
    internalCalls: callGraph.internalCalls || [],
    externalCalls: callGraph.externalCalls || [],
    externalCallCount: (callGraph.externalCalls || []).length,
    // Unified calls: combine functionInfo.calls with callGraph results
    calls: [
      ...(functionInfo.calls || []),
      ...(callGraph.internalCalls || []).map(c => ({
        name: c.name || c.callee,
        type: c.type || 'internal',
        line: c.line
      })),
      ...(callGraph.externalCalls || []).map(c => ({
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
    hasLifecycleHooks: temporal.lifecycleHooks.length > 0,
    lifecycleHooks: temporal.lifecycleHooks,
    hasCleanupPatterns: temporal.cleanupPatterns.length > 0,

    // Temporal Connections
    temporal: {
      patterns: temporalPatterns,
      executionOrder: null // Se llena en cross-reference
    },

    // Type Contracts
    typeContracts: typeContracts,

    // Error Flow
    errorFlow: errorFlow,

    // Performance
    hasNestedLoops: performanceHints.nestedLoops.length > 0,
    hasBlockingOps: performanceHints.blockingOperations.length > 0,
    performance: performanceMetrics,

    // Data Flow Fractal
    dataFlow: dataFlowV2?.real || dataFlowV2 || null,
    dataFlowAnalysis: dataFlowV2?.analysis || null,
    hasDataFlow: dataFlowV2 !== null && (dataFlowV2.inputs?.length > 0 || dataFlowV2.real?.inputs?.length > 0),

    // DNA & Lineage
    dna: null,
    lineage: null,

    // Metadata
    extractedAt: new Date().toISOString(),
    _meta: {
      dataFlowVersion: '1.0.0-fractal',
      extractionTime: new Date().toISOString(),
      confidence: dataFlowV2?.analysis?.coherence ? dataFlowV2.analysis.coherence / 100 : 0.5
    }
  };
}

export default buildAtomMetadata;

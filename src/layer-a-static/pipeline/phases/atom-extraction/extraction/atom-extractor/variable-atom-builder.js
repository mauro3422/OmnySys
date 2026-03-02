/**
 * Variable atom builder for constant and config exports
 * @module pipeline/phases/atom-extraction/extraction/atom-extractor/variable-atom-builder
 */

/**
 * Build an atom for a variable/constant export
 * @param {Object} varInfo - Variable info from parser
 * @param {string} filePath - File path
 * @param {string} varType - 'constant' or 'config'
 * @param {Array} imports - File-level imports
 * @returns {Object} - Atom metadata
 */
export function buildVariableAtom(varInfo, filePath, varType = 'constant', imports = [], extractionDepth = 'deep') {
  const name = varInfo.name;
  const line = varInfo.line || 0;
  const isStructural = extractionDepth === 'structural';

  return {
    id: `${filePath}::${name}`,
    name,
    type: 'variable',
    filePath,
    line,
    endLine: line,
    linesOfCode: 1,
    isPhase2Complete: !isStructural,

    kind: 'const',
    valueType: varType === 'config' ? 'object' : (varInfo.valueType || 'unknown'),
    valueProperties: varInfo.properties || varInfo.propertyDetails || [],
    isSignificant: varType === 'config',

    isExported: true,

    complexity: 1,
    hasSideEffects: false,
    hasNetworkCalls: false,
    hasDomManipulation: false,
    hasStorageAccess: false,
    hasLogging: false,
    networkEndpoints: [],

    calls: [],
    internalCalls: [],
    externalCalls: [],
    externalCallCount: 0,

    className: null,
    functionType: 'variable',
    isAsync: false,
    hasErrorHandling: false,
    hasNestedLoops: false,
    hasBlockingOps: false,

    hasLifecycleHooks: false,
    lifecycleHooks: [],
    hasCleanupPatterns: false,
    temporal: {
      patterns: { timers: [], asyncPatterns: null, events: [], lifecycleHooks: [], executionOrder: { mustRunBefore: [], mustRunAfter: [], canRunInParallel: [] } },
      executionOrder: null
    },

    typeContracts: {
      params: [],
      returns: null,
      throws: [],
      generics: [],
      signature: `const ${name}: ${varType}`,
      confidence: 0.8
    },

    errorFlow: { throws: [], catches: [], tryBlocks: [], unhandledCalls: [], propagation: 'none' },

    performance: {
      complexity: { cyclomatic: 1, cognitive: 0, bigO: 'O(1)' },
      expensiveOps: { nestedLoops: 0, recursion: false, blockingOps: [], heavyCalls: [] },
      resources: { network: false, disk: false, memory: 'low', dom: false },
      estimates: { executionTime: 'instant', blocking: false, async: false, expensiveWithCache: false },
      impactScore: 0
    },

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

    archetype: {
      type: varType === 'config' ? 'config' : 'constant',
      severity: varInfo.riskLevel === 'high' ? 3 : (varInfo.riskLevel === 'medium' ? 2 : 1),
      confidence: 1
    },

    purpose: 'API_EXPORT',
    purposeReason: 'Exported variable/constant (public API)',
    purposeConfidence: 1.0,
    isDeadCode: false,

    calledBy: [],

    imports: imports.map(imp => ({
      source: imp.source || imp.module,
      type: imp.type,
      specifiers: imp.names || imp.specifiers || [],
      line: imp.line
    })),

    derived: {
      fragilityScore: 0,
      testabilityScore: 1,
      couplingScore: 0,
      changeRisk: varInfo.riskLevel === 'high' ? 0.4 : (varInfo.riskLevel === 'medium' ? 0.2 : 0.1)
    }
  };
}

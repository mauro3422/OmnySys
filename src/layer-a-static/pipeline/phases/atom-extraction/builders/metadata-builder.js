/**
 * @fileoverview metadata-builder.js
 *
 * Builds atom metadata object from extracted information
 *
 * @module pipeline/phases/atom-extraction/builders/metadata-builder
 */

import {
  buildCallFields,
  buildDataFlowFields,
  buildDerivedScores,
  buildImports,
  buildMeta,
  buildSideEffectFields,
  detectErrorHandling,
  summarizeScopeTypes
} from '../../../../../shared/compiler/atom-metadata-helpers.js';

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
  jsdocContracts = null,
  treeSitter = null
}) {
  const se = sideEffects || { all: [], networkCalls: [], domManipulations: [], storageAccess: [], consoleUsage: [] };
  const cg = callGraph || { internalCalls: [], externalCalls: [] };
  const tmp = temporal || { lifecycleHooks: [], cleanupPatterns: [] };
  const ph = performanceHints || { nestedLoops: [], blockingOperations: [] };
  const scopeSummary = summarizeScopeTypes(treeSitter?.sharedStateAccess || []);

  let jsdocMatch = null;
  if (jsdocContracts?.functions) {
    const astDocLine = functionInfo.jsdoc?.line;
    if (astDocLine) {
      jsdocMatch = jsdocContracts.functions.find(c => c.line === astDocLine);
    }

    if (!jsdocMatch) {
      const fnLine = functionInfo.line || functionInfo.lineStart || 0;
      jsdocMatch = jsdocContracts.functions.find(c => c.line >= fnLine - 10 && c.line < fnLine);
    }
  }

  return {
    id: functionInfo.id || `${filePath}::${functionInfo.fullName || functionInfo.name}`,
    name: functionInfo.name,
    type: functionInfo.type || 'atom',
    filePath,
    line: functionInfo.line,
    endLine: functionInfo.endLine,
    linesOfCode,

    isExported: functionInfo.isExported,
    className: functionInfo.className || null,
    functionType: functionInfo.type || 'declaration',

    isTestCallback: functionInfo.isTestCallback || false,
    testCallbackType: functionInfo.testCallbackType || null,

    complexity,

    signature: {
      params: functionInfo.params || [],
      returnType: functionInfo.returnType || 'any'
    },

    ...buildSideEffectFields(se, dataFlowV2),
    ...buildCallFields(functionInfo, cg),
    hasErrorHandling: detectErrorHandling(functionCode),
    isAsync: functionInfo.isAsync || /async\s+function/.test(functionCode) || /await\s+/.test(functionCode),

    hasLifecycleHooks: tmp.lifecycleHooks.length > 0,
    lifecycleHooks: tmp.lifecycleHooks,
    hasCleanupPatterns: tmp.cleanupPatterns.length > 0,
    temporal: { patterns: temporalPatterns, executionOrder: temporalPatterns?.executionOrder || null },

    typeContracts,
    errorFlow,

    deprecated: jsdocMatch?.deprecated || false,
    deprecatedReason: jsdocMatch?.deprecatedReason || '',

    hasNestedLoops: ph.nestedLoops.length > 0,
    hasBlockingOps: ph.blockingOperations.length > 0,
    performance: {
      ...ph,
      ...performanceMetrics
    },

    ...buildDataFlowFields(dataFlowV2),
    derived: buildDerivedScores(complexity, cg, se, errorFlow, ph, functionInfo),
    semanticDomain: semanticDomain || null,

    sharedStateAccess: treeSitter?.sharedStateAccess || [],
    eventEmitters: treeSitter?.eventEmitters || [],
    eventListeners: treeSitter?.eventListeners || [],
    scopeType: scopeSummary.scopeType,

    dna: null,
    lineage: null,

    imports: buildImports(imports),
    importsJson: buildImports(imports),
    exportsJson: functionInfo.isExported
      ? [{ name: functionInfo.name, type: functionInfo.type || 'declaration', line: functionInfo.line }]
      : [],
    sideEffectsJson: se,

    extractedAt: new Date().toISOString(),
    _meta: {
      ...buildMeta(dataFlowV2),
      identifierRefs: functionInfo.identifierRefs || [],
      daemonSideEffects: jsdocMatch?.tags?.filter(t => t.title === 'omny_side_effect').map(t => t.content) || [],
      scopeTypes: scopeSummary.scopeTypes,
      scopeTypeBreakdown: scopeSummary.scopeTypeBreakdown
    }
  };
}

export default buildAtomMetadata;

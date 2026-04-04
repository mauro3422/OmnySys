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

const TEST_CALLBACK_RE = /^(describe|it|test|beforeEach|afterEach|beforeAll|afterAll)\b/i;

export function inferTestCallbackType(functionInfo) {
  if (functionInfo?.testCallbackType) {
    return functionInfo.testCallbackType;
  }

  const name = typeof functionInfo?.name === 'string' ? functionInfo.name.trim() : '';
  const match = name.match(TEST_CALLBACK_RE);
  return match ? match[1] : null;
}

function buildUsesJson(callFields, imports) {
  const uses = [];
  const seen = new Set();

  const pushUse = (key, value) => {
    if (!key || seen.has(key)) return;
    seen.add(key);
    uses.push(value);
  };

  for (const call of callFields?.calls || []) {
    const name = call?.name || call?.callee;
    if (!name) continue;

    const type = call?.type || 'internal';
    const line = call?.line ?? null;
    pushUse(`call:${name}:${type}:${line ?? ''}`, {
      kind: 'call',
      name,
      type,
      line
    });
  }

  for (const imp of imports || []) {
    const source = imp?.source || imp?.module;
    if (!source) continue;

    const specifiers = Array.isArray(imp?.specifiers) ? imp.specifiers : [];
    pushUse(`import:${source}:${specifiers.join(',')}`, {
      kind: 'import',
      source,
      specifiers,
      line: imp?.line ?? null
    });
  }

  return uses;
}

function findClosestJSDocContract(contracts = [], line = 0, maxDistance = 12) {
  if (!Array.isArray(contracts) || contracts.length === 0 || !Number.isFinite(line)) {
    return null;
  }

  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const contract of contracts) {
    const candidateLine = Number(contract?.line || 0);
    if (!candidateLine) {
      continue;
    }

    const distance = Math.abs(candidateLine - line);
    if (distance > maxDistance) {
      continue;
    }

    if (distance < bestDistance || (distance === bestDistance && contract.deprecated && !best?.deprecated)) {
      best = contract;
      bestDistance = distance;
    }
  }

  return best;
}

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
  const callFields = buildCallFields(functionInfo, cg);
  const normalizedImports = buildImports(imports);
  const testCallbackType = inferTestCallbackType(functionInfo);

  let jsdocMatch = null;
  if (jsdocContracts?.functions) {
    const astDocLine = functionInfo.jsdoc?.line;
    if (astDocLine) {
      jsdocMatch = jsdocContracts.functions.find(c => c.line === astDocLine);
    }

    if (!jsdocMatch) {
      const fnLine = functionInfo.line || functionInfo.lineStart || 0;
      jsdocMatch = jsdocContracts.functions.find(c => c.line >= fnLine - 10 && c.line <= fnLine + 1);
    }

    if (!jsdocMatch && Array.isArray(jsdocContracts.all)) {
      const fnLine = functionInfo.line || functionInfo.lineStart || 0;
      jsdocMatch = findClosestJSDocContract(jsdocContracts.all, fnLine);
    }
  }

  const derivedScores = buildDerivedScores(complexity, linesOfCode, cg, se, errorFlow, ph, functionInfo);

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

    isTestCallback: functionInfo.isTestCallback || testCallbackType !== null,
    testCallbackType,

    complexity,

    signature: {
      params: functionInfo.params || [],
      returnType: functionInfo.returnType || 'any'
    },

    ...buildSideEffectFields(se, dataFlowV2),
    ...callFields,
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
    derived: derivedScores,
    fragilityScore: derivedScores.fragilityScore,
    cohesionScore: derivedScores.cohesionScore,
    couplingScore: derivedScores.couplingScore,
    testabilityScore: derivedScores.testabilityScore,
    changeRisk: derivedScores.changeRisk,
    semanticDomain: semanticDomain || null,

    sharedStateAccess: treeSitter?.sharedStateAccess || [],
    eventEmitters: treeSitter?.eventEmitters || [],
    eventListeners: treeSitter?.eventListeners || [],
    scopeType: scopeSummary.scopeType,

    dna: null,
    lineage: null,

    imports: normalizedImports,
    importsJson: normalizedImports,
    usesJson: buildUsesJson(callFields, normalizedImports),
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

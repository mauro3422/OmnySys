/**
 * @fileoverview Shared helpers for atom metadata building
 * @module pipeline/phases/atom-extraction/builders/metadata-builder-helpers
 */

import { determineScopeType } from '../../layer-a-static/extractors/metadata/tree-sitter-integration.js';

export function detectErrorHandling(functionCode) {
  if (!functionCode || typeof functionCode !== 'string') {
    return false;
  }

  const code = functionCode;
  if (/try\s*\{[\s\S]*?\}\s*catch\s*\(?[\s\S]*?\)?\s*\{/.test(code)) return true;
  if (/\.catch\s*\(/.test(code)) return true;
  if (/try\s*\{[^}]*\}\s*catch\s*[\({][^}]*\{/.test(code)) return true;
  if (/async.*try\s*\{/.test(code)) return true;

  return false;
}

export function buildSideEffectFields(se, dataFlowV2) {
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

export function buildCallFields(functionInfo, cg) {
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

export function buildDataFlowFields(dataFlowV2) {
  return {
    dataFlow: dataFlowV2?.real || dataFlowV2 || null,
    dataFlowAnalysis: dataFlowV2?.analysis || null,
    hasDataFlow: dataFlowV2 !== null &&
      (dataFlowV2.inputs?.length > 0 || dataFlowV2.real?.inputs?.length > 0)
  };
}

export function buildImports(imports) {
  return imports.map(imp => ({
    source: imp.source || imp.module,
    type: imp.type,
    specifiers: imp.names || imp.specifiers || [],
    line: imp.line
  }));
}

export function buildMeta(dataFlowV2) {
  return {
    dataFlowVersion: '1.0.0-fractal',
    extractionTime: new Date().toISOString(),
    confidence: dataFlowV2?.analysis?.coherence ? dataFlowV2.analysis.coherence / 100 : 0.5
  };
}

export function summarizeScopeTypes(sharedStateAccess = []) {
  const scopeCounts = new Map();

  for (const access of sharedStateAccess) {
    const scopeType = access?.scopeType || determineScopeType(access);
    if (!scopeType) continue;
    scopeCounts.set(scopeType, (scopeCounts.get(scopeType) || 0) + 1);
  }

  if (scopeCounts.size === 0) {
    return {
      scopeType: null,
      scopeTypes: [],
      scopeTypeBreakdown: {}
    };
  }

  const priority = ['closure', 'global', 'module', 'local'];
  let dominantScope = null;
  let dominantCount = -1;

  for (const [scopeType, count] of scopeCounts.entries()) {
    const dominantPriority = dominantScope ? priority.indexOf(dominantScope) : priority.length;
    const currentPriority = priority.indexOf(scopeType);
    if (
      count > dominantCount ||
      (count === dominantCount && currentPriority < dominantPriority)
    ) {
      dominantScope = scopeType;
      dominantCount = count;
    }
  }

  return {
    scopeType: dominantScope,
    scopeTypes: [...scopeCounts.keys()],
    scopeTypeBreakdown: Object.fromEntries(scopeCounts)
  };
}

export function buildDerivedScores(complexity, cg, se, errorFlow, ph, functionInfo) {
  return {
    fragilityScore: computeFragilityScore(complexity, cg, errorFlow, ph),
    testabilityScore: computeTestabilityScore(complexity, se, ph, functionInfo),
    couplingScore: (cg.externalCalls?.length || 0) + (cg.internalCalls?.length || 0),
    changeRisk: computeBaseChangeRisk(complexity, functionInfo.isExported)
  };
}

function computeFragilityScore(complexity, callGraph, errorFlow, performanceHints) {
  let score = 0;
  score += Math.min(0.4, complexity / 100);
  score += performanceHints?.nestedLoops?.length > 0 ? 0.2 : 0;
  score += errorFlow?.propagation === 'partial' ? 0.2 : 0;
  score += performanceHints?.blockingOperations?.length > 0 ? 0.1 : 0;
  score += Math.min(0.1, (callGraph?.externalCalls?.length || 0) / 20);
  return Math.round(Math.min(1, score) * 100) / 100;
}

function computeTestabilityScore(complexity, sideEffects, performanceHints, functionInfo) {
  let score = 1;
  score -= Math.min(0.4, complexity / 80);
  score -= sideEffects?.all?.length > 0 ? 0.2 : 0;
  score -= performanceHints?.nestedLoops?.length > 0 ? 0.15 : 0;
  score -= functionInfo?.isAsync ? 0.1 : 0;
  score -= Math.min(0.15, (functionInfo?.params?.length || 0) / 10);
  return Math.round(Math.max(0, score) * 100) / 100;
}

function computeBaseChangeRisk(complexity, isExported) {
  return Math.round(((isExported ? 0.2 : 0) + Math.min(0.3, complexity / 100)) * 100) / 100;
}

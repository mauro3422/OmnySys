import { buildConnectedSystems } from './connected-systems.js';
import { buildPropagationMode } from './mode-resolver.js';
import { normalizePropagationCore, normalizePropagationCollections } from './normalization.js';
import { buildPropagationCacheKey, getPropagationPlanCacheEntry, setPropagationPlanCacheEntry } from './cache.js';

function buildPropagationPlan(input = {}) {
  const cacheKey = input.cacheKey || buildPropagationCacheKey(input);
  const changeType = input.changeType || 'folderization';
  const decision = input.decision || 'reject';
  const mode = buildPropagationMode(changeType, decision, input.mode);

  return {
    changeType,
    decision,
    mode,
    moveTargetCount: Number(input.moveTargetCount || 0),
    impactedFileCount: Number(input.impactedFileCount || 0),
    rewriteCount: Number(input.rewriteCount || 0),
    renameTargetCount: Number(input.renameTargetCount || 0),
    validationTargetCount: Number(input.validationTargetCount || 0),
    hasCrossFamilyPropagation: Boolean(input.hasCrossFamilyPropagation),
    topImpactedFiles: input.topImpactedFiles || [],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || 0),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || 0),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    guidance: input.guidance || null,
    recommendationStrategy: input.recommendationStrategy || null,
    drift: input.drift || null,
    scopePath: input.scopePath || null,
    focusPath: input.focusPath || null,
    connectedSystems: Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
      ? input.connectedSystems
      : buildConnectedSystems(changeType),
    cacheKey,
    cacheHit: Boolean(input.cacheHit)
  };
}

function summarizePropagationPlan(plan = null) {
  if (!plan) {
    return null;
  }

  return {
    ...normalizePropagationCore(plan),
    ...normalizePropagationCollections(plan)
  };
}

export { buildPropagationPlan, summarizePropagationPlan };

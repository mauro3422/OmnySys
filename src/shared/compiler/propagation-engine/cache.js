import { createHash } from 'node:crypto';
import { normalizeChangeSpecificKeyFields, normalizeList } from './normalization.js';

function buildPropagationCacheKey(input = {}) {
  return createHash('sha1')
    .update(JSON.stringify({
      changeType: input.changeType || 'folderization',
      scopePath: input.scopePath || null,
      focusPath: input.focusPath || null,
      decision: input.decision || 'reject',
      mode: input.mode || null,
      moveTargetCount: Number(input.moveTargetCount || 0),
      ...normalizeChangeSpecificKeyFields(input),
      renameTargetCount: Number(input.renameTargetCount || 0),
      validationTargetCount: Number(input.validationTargetCount || 0),
      candidateCount: Number(input.candidateCount || 0),
      flatFamilies: Number(input.flatFamilies || 0),
      mixedFamilies: Number(input.mixedFamilies || 0),
      alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
      hasCrossFamilyPropagation: Boolean(input.hasCrossFamilyPropagation),
      guidance: input.guidance || null,
      recommendationStrategy: input.recommendationStrategy || null,
      driftState: input.drift?.state || input.driftState || null,
      connectedSystems: normalizeList(input.connectedSystems).map((item) => item?.name || item?.role || item).filter(Boolean)
    }))
    .digest('hex')
    .slice(0, 16);
}

const PROPAGATION_PLAN_CACHE = new Map();

function getPropagationPlanCacheEntry(cacheKey = null) {
  if (!cacheKey) {
    return null;
  }

  return PROPAGATION_PLAN_CACHE.get(cacheKey) || null;
}

function setPropagationPlanCacheEntry(cacheKey = null, plan = null) {
  if (!cacheKey || !plan) {
    return null;
  }

  const entry = {
    cacheKey,
    cachedAt: new Date().toISOString(),
    plan
  };
  PROPAGATION_PLAN_CACHE.set(cacheKey, entry);
  return entry;
}

function clearPropagationPlanCache() {
  PROPAGATION_PLAN_CACHE.clear();
}

export { buildPropagationCacheKey, getPropagationPlanCacheEntry, setPropagationPlanCacheEntry, clearPropagationPlanCache, PROPAGATION_PLAN_CACHE };

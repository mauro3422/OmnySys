import { createHash } from 'node:crypto';

function normalizeList(items = []) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function takeTop(items = [], limit = 5) {
  return normalizeList(items).slice(0, Math.max(0, Number(limit) || 0));
}

function buildConnectedSystems(changeType = 'folderization') {
  const folderizationSystems = [
    { name: 'folderization', role: 'planner' },
    { name: 'rename_folderized_family', role: 'normalizer' },
    { name: 'technical_debt_report', role: 'consumer' },
    { name: 'status_panel', role: 'visibility' },
    { name: 'health_snapshot', role: 'history' },
    { name: 'compiler_explainability', role: 'explainability' },
    { name: 'cache_policy', role: 'freshness' },
    { name: 'watcher', role: 'reconciliation' },
    { name: 'drift_assessment', role: 'governance' }
  ];

  if (changeType === 'impact_wave') {
    return [
      { name: 'impact_wave_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'export_validation', role: 'verification' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'rename') {
    return [
      { name: 'rename_folderized_family', role: 'planner' },
      { name: 'folderization', role: 'context' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'watcher', role: 'reconciliation' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  return folderizationSystems;
}

function buildPropagationMode(changeType, decision, mode = null) {
  if (mode) {
    return mode;
  }

  if (changeType === 'impact_wave') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  return decision === 'approve'
    ? 'move_and_rewrite'
    : decision === 'review'
      ? 'review'
      : decision === 'already_folderized'
        ? 'rename_only'
        : 'blocked';
}

function normalizePropagationCore(plan = {}) {
  return {
    changeType: plan.changeType || 'folderization',
    decision: plan.decision || 'reject',
    mode: plan.mode || 'blocked',
    moveTargetCount: Number(plan.moveTargetCount || 0),
    impactedFileCount: Number(plan.impactedFileCount || 0),
    rewriteCount: Number(plan.rewriteCount || 0),
    renameTargetCount: Number(plan.renameTargetCount || 0),
    validationTargetCount: Number(plan.validationTargetCount || 0),
    hasCrossFamilyPropagation: Boolean(plan.hasCrossFamilyPropagation),
    candidateCount: Number(plan.candidateCount || 0),
    flatFamilies: Number(plan.flatFamilies || 0),
    mixedFamilies: Number(plan.mixedFamilies || 0),
    alreadyFolderizedFamilies: Number(plan.alreadyFolderizedFamilies || 0),
    guidance: plan.guidance || null,
    recommendationStrategy: plan.recommendationStrategy || null,
    drift: plan.drift || null,
    scopePath: plan.scopePath || null,
    focusPath: plan.focusPath || null,
    cacheKey: plan.cacheKey || null,
    cacheHit: Boolean(plan.cacheHit)
  };
}

function normalizePropagationCollections(plan = {}) {
  return {
    topImpactedFiles: takeTop(plan.topImpactedFiles || [], 3),
    topCandidates: takeTop(plan.topCandidates || [], 3),
    connectedSystems: normalizeList(plan.connectedSystems).slice(0, 10)
  };
}

export function buildPropagationCacheKey(input = {}) {
  return createHash('sha1')
    .update(JSON.stringify({
      changeType: input.changeType || 'folderization',
      scopePath: input.scopePath || null,
      focusPath: input.focusPath || null,
      decision: input.decision || 'reject',
      mode: input.mode || null,
      moveTargetCount: Number(input.moveTargetCount || 0),
      impactedFileCount: Number(input.impactedFileCount || 0),
      rewriteCount: Number(input.rewriteCount || 0),
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

export function getPropagationPlanCacheEntry(cacheKey = null) {
  if (!cacheKey) {
    return null;
  }

  return PROPAGATION_PLAN_CACHE.get(cacheKey) || null;
}

export function setPropagationPlanCacheEntry(cacheKey = null, plan = null) {
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

export function clearPropagationPlanCache() {
  PROPAGATION_PLAN_CACHE.clear();
}

export function buildPropagationPlan(input = {}) {
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
    topImpactedFiles: takeTop(input.topImpactedFiles || [], 5),
    topCandidates: takeTop(input.topCandidates || [], 5),
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

export function summarizePropagationPlan(plan = null) {
  if (!plan) {
    return null;
  }

  return {
    ...normalizePropagationCore(plan),
    ...normalizePropagationCollections(plan)
  };
}

export function buildImpactWavePropagationPlan(input = {}) {
  const severity = input.severity || 'low';
  const decision = input.decision || (severity === 'low' ? 'approve' : 'review');
  const mode = input.mode || (severity === 'low' ? 'alert_and_recommend' : 'alert_and_review');
  const guidance = input.guidance || 'Surface the impact wave plan to watcher alerts, export validation, cache policy, and drift governance.';
  const recommendationStrategy = input.recommendationStrategy || 'impact_wave';
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('impact_wave');

  return buildPropagationPlan({
    ...input,
    changeType: 'impact_wave',
    decision,
    mode,
    guidance,
    recommendationStrategy,
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? (Number(input.impactedFileCount || 0) > 0 || Number(input.rewriteCount || 0) > 0),
    connectedSystems
  });
}

export default {
  buildPropagationCacheKey,
  buildImpactWavePropagationPlan,
  buildPropagationPlan,
  clearPropagationPlanCache,
  getPropagationPlanCacheEntry,
  setPropagationPlanCacheEntry,
  summarizePropagationPlan
};

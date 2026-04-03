function normalizeList(items = []) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function takeTop(items = [], limit = 5) {
  return normalizeList(items).slice(0, Math.max(0, Number(limit) || 0));
}

function buildFolderizationConnectedSystems() {
  return [
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
}

export function buildPropagationPlan(input = {}) {
  const mode = input.mode || (input.decision === 'approve'
    ? 'move_and_rewrite'
    : input.decision === 'review'
      ? 'review'
      : input.decision === 'already_folderized'
        ? 'rename_only'
        : 'blocked');

  return {
    changeType: input.changeType || 'folderization',
    decision: input.decision || 'reject',
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
    connectedSystems: Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
      ? input.connectedSystems
      : buildFolderizationConnectedSystems()
  };
}

export function summarizePropagationPlan(plan = null) {
  if (!plan) {
    return null;
  }

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
    topImpactedFiles: takeTop(plan.topImpactedFiles || [], 3),
    topCandidates: takeTop(plan.topCandidates || [], 3),
    candidateCount: Number(plan.candidateCount || 0),
    flatFamilies: Number(plan.flatFamilies || 0),
    mixedFamilies: Number(plan.mixedFamilies || 0),
    alreadyFolderizedFamilies: Number(plan.alreadyFolderizedFamilies || 0),
    guidance: plan.guidance || null,
    recommendationStrategy: plan.recommendationStrategy || null,
    drift: plan.drift || null,
    connectedSystems: normalizeList(plan.connectedSystems).slice(0, 10)
  };
}

export default {
  buildPropagationPlan,
  summarizePropagationPlan
};

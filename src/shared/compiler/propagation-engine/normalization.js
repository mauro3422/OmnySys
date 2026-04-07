function normalizeList(items = []) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

function takeTop(items = [], limit = 5) {
  return normalizeList(items).slice(0, Math.max(0, Number(limit) || 0));
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

function normalizeChangeSpecificKeyFields(input = {}) {
  return {
    previousSignal: Number(input.previousSignal || 0),
    currentSignal: Number(input.currentSignal || 0),
    ratio: input.ratio === undefined ? null : Number(input.ratio),
    regressedAtomCount: Number(input.regressedAtomCount || 0),
    gapCount: Number(input.gapCount || 0),
    sharesStateRelations: Number(input.sharesStateRelations || 0),
    networkCandidateCount: Number(input.networkCandidateCount || 0),
    findingCount: Number(input.findingCount || 0),
    ruleCount: Number(input.ruleCount || 0),
    policyAreaCount: Number(input.policyAreaCount || 0),
    warningCount: Number(input.warningCount || 0),
    orphanCount: Number(input.orphanCount || 0),
    duplicateCount: Number(input.duplicateCount || 0),
    violationCount: Number(input.violationCount || 0),
    impactedFileCount: Number(input.impactedFileCount || 0),
    rewriteCount: Number(input.rewriteCount || 0)
  };
}

function normalizePropagationCollections(plan = {}) {
  return {
    topImpactedFiles: takeTop(plan.topImpactedFiles || [], 3),
    topCandidates: takeTop(plan.topCandidates || [], 3),
    connectedSystems: normalizeList(plan.connectedSystems).slice(0, 10)
  };
}

export { normalizeList, takeTop, normalizePropagationCore, normalizeChangeSpecificKeyFields, normalizePropagationCollections };

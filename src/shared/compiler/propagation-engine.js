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

  if (changeType === 'topology_regression') {
    return [
      { name: 'topology_regression_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'semantic_coverage', role: 'verification' },
      { name: 'semantic_persistence', role: 'storage' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'semantic_coverage') {
    return [
      { name: 'semantic_coverage_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'semantic_persistence', role: 'storage' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'policy_drift') {
    return [
      { name: 'compiler_policy_conformance_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' },
      { name: 'semantic_persistence', role: 'storage' }
    ];
  }

  if (changeType === 'pipeline_health') {
    return [
      { name: 'pipeline_health_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'pipeline_orphan') {
    return [
      { name: 'pipeline_orphan_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' },
      { name: 'semantic_persistence', role: 'storage' }
    ];
  }

  if (changeType === 'duplicate_risk_remediation') {
    return [
      { name: 'duplicate_risk_remediation', role: 'evidence' },
      { name: 'folderization', role: 'structure' },
      { name: 'rename_folderized_family', role: 'normalizer' },
      { name: 'watcher', role: 'persistence' },
      { name: 'technical_debt_report', role: 'consumer' },
      { name: 'status_panel', role: 'visibility' },
      { name: 'health_snapshot', role: 'history' },
      { name: 'compiler_explainability', role: 'explainability' },
      { name: 'cache_policy', role: 'freshness' },
      { name: 'drift_assessment', role: 'governance' }
    ];
  }

  if (changeType === 'integrity_guard') {
    return [
      { name: 'integrity_guard', role: 'evidence' },
      { name: 'watcher', role: 'persistence' },
      { name: 'semantic_persistence', role: 'storage' },
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

  if (changeType === 'topology_regression') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  if (changeType === 'semantic_coverage') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  if (changeType === 'policy_drift') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  if (changeType === 'pipeline_health' || changeType === 'pipeline_orphan') {
    if (decision === 'reject') return 'alert_only';
    if (decision === 'approve') return 'alert_and_recommend';
    return 'alert_and_review';
  }

  if (changeType === 'duplicate_risk_remediation') {
    if (decision === 'reject') return 'recommend_only';
    if (decision === 'approve') return 'remediate_and_rewrite';
    return 'recommend_and_review';
  }

  if (changeType === 'integrity_guard') {
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

export function buildPropagationCacheKey(input = {}) {
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

export function buildTopologyRegressionPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const impactedFileCount = Number(input.impactedFileCount || 1);
  const regressedAtomCount = Number(input.regressedAtomCount || 0);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('topology_regression');

  return buildPropagationPlan({
    ...input,
    changeType: 'topology_regression',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface the topology regression plan to watcher persistence, semantic coverage, and drift governance before trusting the recalculated graph.',
    recommendationStrategy: input.recommendationStrategy || 'topology_regression',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || regressedAtomCount || 0),
    validationTargetCount: Number(input.validationTargetCount || impactedFileCount + regressedAtomCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? (impactedFileCount > 1 || regressedAtomCount > 0),
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || regressedAtomCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (impactedFileCount > 1 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: regressedAtomCount > 0 ? 'watch' : 'stable',
      reason: regressedAtomCount > 0 ? 'regressed topology signal' : 'no regressed topology signal'
    },
    connectedSystems
  });
}

export function buildSemanticCoveragePropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const gapCount = Number(input.gapCount || (Array.isArray(input.gaps) ? input.gaps.length : 0));
  const sharesStateRelations = Number(input.sharesStateRelations || 0);
  const networkCandidateCount = Number(input.networkCandidateCount || (Array.isArray(input.networkCandidates) ? input.networkCandidates.length : 0));
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('semantic_coverage');

  return buildPropagationPlan({
    ...input,
    changeType: 'semantic_coverage',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface semantic coverage gaps to watcher persistence, semantic storage, and drift governance before trusting the extracted graph.',
    recommendationStrategy: input.recommendationStrategy || 'semantic_coverage',
    impactedFileCount: Number(input.impactedFileCount || 1),
    rewriteCount: Number(input.rewriteCount || gapCount),
    validationTargetCount: Number(input.validationTargetCount || gapCount + sharesStateRelations + networkCandidateCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? (gapCount > 0 || sharesStateRelations > 0 || networkCandidateCount > 0),
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || gapCount + networkCandidateCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (gapCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: gapCount > 0 ? 'watch' : 'stable',
      reason: gapCount > 0 ? 'semantic coverage gap' : 'no semantic coverage gap'
    },
    connectedSystems
  });
}

export function buildPolicyDriftPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const findingCount = Number(input.findingCount || (Array.isArray(input.findings) ? input.findings.length : 0));
  const ruleCount = Number(input.ruleCount || (input.summary?.byRule ? Object.keys(input.summary.byRule).length : 0));
  const policyAreaCount = Number(input.policyAreaCount || (input.summary?.byPolicyArea ? Object.keys(input.summary.byPolicyArea).length : 0));
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('policy_drift');

  return buildPropagationPlan({
    ...input,
    changeType: 'policy_drift',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface policy drift to watcher persistence, technical debt, and governance consumers before trusting the canonical compiler APIs.',
    recommendationStrategy: input.recommendationStrategy || 'policy_drift',
    impactedFileCount: Number(input.impactedFileCount || 1),
    rewriteCount: Number(input.rewriteCount || findingCount),
    validationTargetCount: Number(input.validationTargetCount || findingCount + ruleCount + policyAreaCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? (findingCount > 0 || ruleCount > 0 || policyAreaCount > 0),
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || findingCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (findingCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: findingCount > 0 ? 'watch' : 'stable',
      reason: findingCount > 0 ? 'policy drift findings present' : 'no policy drift findings'
    },
    connectedSystems
  });
}

export function buildPipelineHealthPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const warningCount = Number(input.warningCount || 0);
  const impactedFileCount = Number(input.impactedFileCount || 1);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('pipeline_health');

  return buildPropagationPlan({
    ...input,
    changeType: 'pipeline_health',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface pipeline health issues to watcher persistence, technical debt, and health snapshots before trusting the indexed graph.',
    recommendationStrategy: input.recommendationStrategy || 'pipeline_health',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || warningCount),
    validationTargetCount: Number(input.validationTargetCount || warningCount + impactedFileCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? warningCount > 0,
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || warningCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (warningCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: warningCount > 0 ? 'watch' : 'stable',
      reason: warningCount > 0 ? 'pipeline health warnings present' : 'no pipeline health warnings'
    },
    connectedSystems
  });
}

export function buildPipelineOrphanPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const orphanCount = Number(input.orphanCount || 0);
  const impactedFileCount = Number(input.impactedFileCount || 1);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('pipeline_orphan');

  return buildPropagationPlan({
    ...input,
    changeType: 'pipeline_orphan',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Route orphan findings to watcher persistence, semantic storage, and debt consumers before trusting pipeline connectivity.',
    recommendationStrategy: input.recommendationStrategy || 'pipeline_orphan',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || orphanCount),
    validationTargetCount: Number(input.validationTargetCount || orphanCount + impactedFileCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? orphanCount > 0,
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || orphanCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (orphanCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: orphanCount > 0 ? 'watch' : 'stable',
      reason: orphanCount > 0 ? 'pipeline orphan evidence present' : 'no pipeline orphan evidence'
    },
    connectedSystems
  });
}

export function buildDuplicateRiskPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'recommend_and_review';
  const duplicateCount = Number(input.duplicateCount || 0);
  const impactedFileCount = Number(input.impactedFileCount || duplicateCount || 1);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('duplicate_risk_remediation');

  return buildPropagationPlan({
    ...input,
    changeType: 'duplicate_risk_remediation',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Route duplicate remediation through folderization, renaming, debt reporting, and cache policy before mutating families.',
    recommendationStrategy: input.recommendationStrategy || 'duplicate_risk_remediation',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || duplicateCount),
    validationTargetCount: Number(input.validationTargetCount || duplicateCount + impactedFileCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? duplicateCount > 0,
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || duplicateCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (duplicateCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: duplicateCount > 0 ? 'watch' : 'stable',
      reason: duplicateCount > 0 ? 'duplicate risk evidence present' : 'no duplicate risk evidence'
    },
    connectedSystems
  });
}

export function buildIntegrityGuardPropagationPlan(input = {}) {
  const severity = input.severity || 'medium';
  const decision = input.decision || 'review';
  const mode = input.mode || 'alert_and_review';
  const violationCount = Number(input.violationCount || 0);
  const impactedFileCount = Number(input.impactedFileCount || 1);
  const connectedSystems = Array.isArray(input.connectedSystems) && input.connectedSystems.length > 0
    ? input.connectedSystems
    : buildConnectedSystems('integrity_guard');

  return buildPropagationPlan({
    ...input,
    changeType: 'integrity_guard',
    severity,
    decision,
    mode,
    guidance: input.guidance || 'Surface integrity violations to watcher persistence, semantic storage, and drift governance before trusting data-flow coherence.',
    recommendationStrategy: input.recommendationStrategy || 'integrity_guard',
    impactedFileCount,
    rewriteCount: Number(input.rewriteCount || violationCount),
    validationTargetCount: Number(input.validationTargetCount || violationCount + impactedFileCount),
    hasCrossFamilyPropagation: input.hasCrossFamilyPropagation ?? violationCount > 0,
    topImpactedFiles: input.topImpactedFiles || [{ filePath: input.focusPath || null }],
    topCandidates: input.topCandidates || [],
    candidateCount: Number(input.candidateCount || violationCount),
    flatFamilies: Number(input.flatFamilies || 0),
    mixedFamilies: Number(input.mixedFamilies || (violationCount > 0 ? 1 : 0)),
    alreadyFolderizedFamilies: Number(input.alreadyFolderizedFamilies || 0),
    drift: input.drift || {
      state: violationCount > 0 ? 'watch' : 'stable',
      reason: violationCount > 0 ? 'integrity violation evidence present' : 'no integrity violation evidence'
    },
    connectedSystems
  });
}

export default {
  buildPropagationCacheKey,
  buildImpactWavePropagationPlan,
  buildTopologyRegressionPropagationPlan,
  buildSemanticCoveragePropagationPlan,
  buildPolicyDriftPropagationPlan,
  buildPipelineHealthPropagationPlan,
  buildPipelineOrphanPropagationPlan,
  buildDuplicateRiskPropagationPlan,
  buildIntegrityGuardPropagationPlan,
  buildPropagationPlan,
  clearPropagationPlanCache,
  getPropagationPlanCacheEntry,
  setPropagationPlanCacheEntry,
  summarizePropagationPlan
};

import {
  buildPropagationCacheKey,
  buildPropagationPlan,
  getPropagationPlanCacheEntry,
  setPropagationPlanCacheEntry
} from '../propagation-engine.js';

function resolvePropagationMode(decision) {
  if (decision === 'approve') return 'move_and_rewrite';
  if (decision === 'review') return 'review';
  if (decision === 'already_folderized') return 'rename_only';
  return 'blocked';
}

function buildPropagationPayload({
  scopePath,
  focusPath,
  decision,
  mode,
  moveTargetCount,
  impactedFileCount,
  rewriteCount,
  renameTargetCount,
  validationTargetCount,
  hasCrossFamilyPropagation,
  topImpactedFiles,
  topCandidates,
  candidateCount,
  flatFamilies,
  mixedFamilies,
  alreadyFolderizedFamilies,
  guidance,
  recommendationStrategy,
  drift
}) {
  return {
    changeType: 'folderization',
    scopePath,
    focusPath,
    decision,
    mode,
    moveTargetCount,
    impactedFileCount,
    rewriteCount,
    renameTargetCount,
    validationTargetCount,
    hasCrossFamilyPropagation,
    topImpactedFiles,
    topCandidates,
    candidateCount,
    flatFamilies,
    mixedFamilies,
    alreadyFolderizedFamilies,
    guidance,
    recommendationStrategy,
    drift
  };
}

function extractTopCandidates(migrationPlans = null, limit = 5) {
  const candidates = Array.isArray(migrationPlans?.candidates) ? migrationPlans.candidates : [];
  return candidates.slice(0, limit).map((plan) => ({
    familyRoot: plan?.candidate?.familyRoot || null,
    directory: plan?.candidate?.directory || null,
    decision: plan?.decision || null,
    moveTargetCount: Array.isArray(plan?.moveTargets) ? plan.moveTargets.length : 0,
    impactedFileCount: Number(plan?.importImpact?.impactedFileCount || 0),
    rewriteCount: Number(plan?.importImpact?.rewriteCount || 0)
  }));
}

function extractTopImpactedFiles(importImpact = null, limit = 5) {
  const files = Array.isArray(importImpact?.impactedFiles) ? importImpact.impactedFiles : [];
  return files.slice(0, limit).map((item) => ({
    filePath: item.filePath || null,
    importCount: Number(item.importCount || 0),
    matchedImports: Array.isArray(item.matchedImports) ? item.matchedImports.slice(0, 5) : [],
    dependencyCount: Number(item.dependencyCount || item.importCount || 0)
  }));
}

function buildFolderizationPropagationSummary({
  candidateReport,
  familyState,
  migrationPlans,
  naming,
  creationGuidance,
  recommendation,
  decision,
  drift
}) {
  const focusPlan = migrationPlans?.focusCandidate || null;
  const importImpact = focusPlan?.importImpact || null;
  const moveTargets = Array.isArray(focusPlan?.moveTargets) ? focusPlan.moveTargets : [];
  const topImpactedFiles = extractTopImpactedFiles(importImpact);
  const topCandidates = extractTopCandidates(migrationPlans);
  const moveTargetCount = moveTargets.length;
  const impactedFileCount = Number(importImpact?.impactedFileCount || 0);
  const rewriteCount = Number(importImpact?.rewriteCount || 0);
  const renameTargetCount = Number(naming?.renameTargetCount || 0);
  const validationTargetCount = moveTargetCount + impactedFileCount + (focusPlan?.candidate?.barrelFile ? 1 : 0);
  const candidateCount = Number(candidateReport?.totalCandidates || candidateReport?.candidateCount || 0);
  const resolvedDecision = decision || focusPlan?.decision || 'reject';
  const mode = resolvePropagationMode(focusPlan?.decision);
  const stateCounts = familyState?.stateCounts || {};

  const commonPayload = {
    scopePath: creationGuidance?.scopePath || null,
    focusPath: creationGuidance?.focusPath || null,
    decision: resolvedDecision,
    mode,
    moveTargetCount,
    impactedFileCount,
    rewriteCount,
    renameTargetCount,
    validationTargetCount,
    hasCrossFamilyPropagation: impactedFileCount > 0 || rewriteCount > 0,
    topImpactedFiles,
    topCandidates,
    candidateCount,
    flatFamilies: Number(stateCounts.flat || 0),
    mixedFamilies: Number(stateCounts.mixed || 0),
    alreadyFolderizedFamilies: Number(stateCounts.already_folderized || 0),
    guidance: creationGuidance?.guidance || null,
    recommendationStrategy: recommendation?.strategy || null,
    drift
  };

  const cacheKey = buildPropagationCacheKey(commonPayload);
  const cachedEntry = getPropagationPlanCacheEntry(cacheKey);
  if (cachedEntry?.plan) {
    return { ...cachedEntry.plan, cacheKey, cacheHit: true };
  }

  const plan = buildPropagationPlan({ ...commonPayload, cacheKey });
  const stored = setPropagationPlanCacheEntry(cacheKey, plan);
  return stored?.plan || plan;
}

export { buildFolderizationPropagationSummary };

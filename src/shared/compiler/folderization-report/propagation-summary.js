import {
  buildPropagationCacheKey,
  buildPropagationPlan,
  getPropagationPlanCacheEntry,
  setPropagationPlanCacheEntry
} from '../propagation-engine.js';

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
  const impactedFiles = Array.isArray(importImpact?.impactedFiles) ? importImpact.impactedFiles : [];
  const topImpactedFiles = impactedFiles.slice(0, 5).map((item) => ({
    filePath: item.filePath || null,
    importCount: Number(item.importCount || 0),
    matchedImports: Array.isArray(item.matchedImports) ? item.matchedImports.slice(0, 5) : [],
    dependencyCount: Number(item.dependencyCount || item.importCount || 0)
  }));
  const topCandidates = Array.isArray(migrationPlans?.candidates)
    ? migrationPlans.candidates.slice(0, 5).map((plan) => ({
        familyRoot: plan?.candidate?.familyRoot || null,
        directory: plan?.candidate?.directory || null,
        decision: plan?.decision || null,
        moveTargetCount: Array.isArray(plan?.moveTargets) ? plan.moveTargets.length : 0,
        impactedFileCount: Number(plan?.importImpact?.impactedFileCount || 0),
        rewriteCount: Number(plan?.importImpact?.rewriteCount || 0)
      }))
    : [];
  const moveTargetCount = moveTargets.length;
  const impactedFileCount = Number(importImpact?.impactedFileCount || 0);
  const rewriteCount = Number(importImpact?.rewriteCount || 0);
  const renameTargetCount = Number(naming?.renameTargetCount || 0);
  const validationTargetCount = moveTargetCount + impactedFileCount + (focusPlan?.candidate?.barrelFile ? 1 : 0);
  const candidateCount = Number(candidateReport?.totalCandidates || candidateReport?.candidateCount || 0);
  const cacheKey = buildPropagationCacheKey({
    changeType: 'folderization',
    scopePath: creationGuidance?.scopePath || null,
    focusPath: creationGuidance?.focusPath || null,
    decision: decision || focusPlan?.decision || 'reject',
    mode: focusPlan?.decision === 'approve'
      ? 'move_and_rewrite'
      : focusPlan?.decision === 'review'
        ? 'review'
        : focusPlan?.decision === 'already_folderized'
          ? 'rename_only'
          : 'blocked',
    moveTargetCount,
    impactedFileCount,
    rewriteCount,
    renameTargetCount,
    validationTargetCount,
    hasCrossFamilyPropagation: impactedFileCount > 0 || rewriteCount > 0,
    topImpactedFiles,
    topCandidates,
    candidateCount,
    flatFamilies: Number(familyState?.stateCounts?.flat || 0),
    mixedFamilies: Number(familyState?.stateCounts?.mixed || 0),
    alreadyFolderizedFamilies: Number(familyState?.stateCounts?.already_folderized || 0),
    guidance: creationGuidance?.guidance || null,
    recommendationStrategy: recommendation?.strategy || null,
    drift
  });
  const cachedEntry = getPropagationPlanCacheEntry(cacheKey);
  if (cachedEntry?.plan) {
    return {
      ...cachedEntry.plan,
      cacheKey,
      cacheHit: true
    };
  }

  const plan = buildPropagationPlan({
    changeType: 'folderization',
    cacheKey,
    scopePath: creationGuidance?.scopePath || null,
    focusPath: creationGuidance?.focusPath || null,
    decision: decision || focusPlan?.decision || 'reject',
    mode: focusPlan?.decision === 'approve'
      ? 'move_and_rewrite'
      : focusPlan?.decision === 'review'
        ? 'review'
        : focusPlan?.decision === 'already_folderized'
          ? 'rename_only'
          : 'blocked',
    moveTargetCount,
    impactedFileCount,
    rewriteCount,
    renameTargetCount,
    validationTargetCount,
    hasCrossFamilyPropagation: impactedFileCount > 0 || rewriteCount > 0,
    topImpactedFiles,
    topCandidates,
    candidateCount,
    flatFamilies: Number(familyState?.stateCounts?.flat || 0),
    mixedFamilies: Number(familyState?.stateCounts?.mixed || 0),
    alreadyFolderizedFamilies: Number(familyState?.stateCounts?.already_folderized || 0),
    guidance: creationGuidance?.guidance || null,
    recommendationStrategy: recommendation?.strategy || null,
    drift
  });
  const stored = setPropagationPlanCacheEntry(cacheKey, plan);
  return stored?.plan || plan;
}

export { buildFolderizationPropagationSummary };

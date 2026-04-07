function buildFolderizationDriftSignal({
  databaseHealthy = true,
  liveRowSyncState = 'fresh',
  candidateReport = null,
  familyState = null,
  naming = null,
  recommendation = null
} = {}) {
  const candidateCount = Number(candidateReport?.candidateCount || 0);
  const flatFamilies = Number(familyState?.stateCounts?.flat || 0);
  const mixedFamilies = Number(familyState?.stateCounts?.mixed || 0);
  const namingTargets = Number(naming?.renameTargetCount || 0);
  const namingDebt = Number(naming?.renameTargetCount || 0);
  const hasStructuralPressure = candidateCount > 0 || flatFamilies > 0 || mixedFamilies > 0 || namingTargets > 0 || namingDebt > 0;

  if (!databaseHealthy) {
    return {
      state: 'blocked',
      score: 100,
      reason: 'Database health is not trustworthy, so folderization guidance should not be consumed.',
      recommendation: 'Reconcile database projections before using folderization to guide new moves.',
      evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
    };
  }

  if (liveRowSyncState === 'blocked') {
    return {
      state: 'blocked',
      score: 90,
      reason: 'Live row sync is blocked, which can invalidate folderization guidance.',
      recommendation: 'Reconcile the live support tables before trusting folderization guidance.',
      evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
    };
  }

  if (liveRowSyncState === 'stale' || liveRowSyncState === 'partial') {
    return {
      state: 'stale',
      score: 50,
      reason: 'Folderization is being evaluated against a partially drifted support surface.',
      recommendation: recommendation?.message || 'Use the folderization snapshot only after live-row reconciliation stabilizes.',
      evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
    };
  }

  if (hasStructuralPressure) {
    return {
      state: 'fresh',
      score: 20,
      reason: 'Folderization pressure exists but the support surface is consistent enough to trust.',
      recommendation: recommendation?.message || 'Keep folderization decisions tied to the strongest reusable family and avoid extra barrels.',
      evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
    };
  }

  return {
    state: 'fresh',
    score: 0,
    reason: 'Folderization support surfaces are aligned.',
    recommendation: recommendation?.message || 'Reuse the closest canonical family and keep barrel logic thin.',
    evidence: { liveRowSyncState, candidateCount, flatFamilies, mixedFamilies, namingTargets, namingDebt }
  };
}

export { buildFolderizationDriftSignal };

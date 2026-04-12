function buildFolderizationNamingDriftSignal({
  databaseHealthy = true,
  liveRowSyncState = 'fresh',
  naming = null,
  familyState = null,
  recommendation = null
} = {}) {
  const renameTargetCount = Number(naming?.renameTargetCount || 0);
  const familyCount = Number(naming?.familyCount || 0);
  const flatFamilies = Number(familyState?.stateCounts?.flat || 0);
  const mixedFamilies = Number(familyState?.stateCounts?.mixed || 0);
  const density = familyCount > 0 ? renameTargetCount / familyCount : renameTargetCount;
  const hasNamingPressure = renameTargetCount > 0 || flatFamilies > 0 || mixedFamilies > 0;

  if (!databaseHealthy) {
    return {
      state: 'blocked',
      score: 100,
      reason: 'Database health is not trustworthy, so naming drift cannot be evaluated safely.',
      recommendation: 'Reconcile the canonical database projections before trusting naming guidance.',
      evidence: { liveRowSyncState, renameTargetCount, familyCount, flatFamilies, mixedFamilies, density }
    };
  }

  if (liveRowSyncState === 'blocked') {
    return {
      state: 'blocked',
      score: 90,
      reason: 'Live row sync is blocked, so naming drift may be stale.',
      recommendation: 'Reconcile the live support tables before trusting naming drift guidance.',
      evidence: { liveRowSyncState, renameTargetCount, familyCount, flatFamilies, mixedFamilies, density }
    };
  }

  if (liveRowSyncState === 'stale' || liveRowSyncState === 'partial') {
    return {
      state: 'watching',
      score: 55,
      reason: 'Naming drift exists but the support surface is partially reconciled.',
      recommendation: recommendation?.message || 'Use naming drift as a guardrail and confirm the split after live-row reconciliation.',
      evidence: { liveRowSyncState, renameTargetCount, familyCount, flatFamilies, mixedFamilies, density }
    };
  }

  if (hasNamingPressure) {
    return {
      state: density > 1 ? 'watching' : 'fresh',
      score: density > 1 ? 35 : 20,
      reason: density > 1
        ? 'Naming debt is concentrated enough to justify a rename guard.'
        : 'Naming debt exists but is currently low pressure.',
      recommendation: recommendation?.message || 'Normalize family basenames before renaming further helpers.',
      evidence: { liveRowSyncState, renameTargetCount, familyCount, flatFamilies, mixedFamilies, density }
    };
  }

  return {
    state: 'fresh',
    score: 0,
    reason: 'No naming drift detected.',
    recommendation: recommendation?.message || 'Keep folderized family names aligned with the canonical role stems.',
    evidence: { liveRowSyncState, renameTargetCount, familyCount, flatFamilies, mixedFamilies, density }
  };
}

export { buildFolderizationNamingDriftSignal };

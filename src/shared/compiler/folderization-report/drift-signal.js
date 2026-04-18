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

function buildFolderizationContractDriftSignal({
  drift = null,
  namingDrift = null,
  propagation = null,
  normalization = null,
  decision = 'reject',
  recommendation = null
} = {}) {
  const propagationMode = propagation?.mode || 'blocked';
  const moveTargetCount = Number(propagation?.moveTargetCount || 0);
  const validationTargetCount = Number(propagation?.validationTargetCount || 0);
  const rewriteCount = Number(propagation?.rewriteCount || 0);
  const normalizationAction = normalization?.summary?.recommendedAction || 'noop';
  const normalizationSafetyLevel = normalization?.summary?.safetyLevel || 'none';
  const namingDriftState = namingDrift?.state || 'fresh';
  const driftState = drift?.state || 'fresh';
  const compactApprovedFamily = (
    decision === 'approve' &&
    moveTargetCount > 0 &&
    moveTargetCount <= 2 &&
    validationTargetCount >= moveTargetCount &&
    propagationMode !== 'blocked' &&
    normalizationSafetyLevel !== 'risky'
  );

  if (compactApprovedFamily) {
    return {
      state: 'fresh',
      score: 0,
      reason: 'Compact folderization family is aligned with the canonical workflow contract.',
      recommendation: recommendation?.message || 'Execute the compact family through the canonical folderization pipeline.',
      evidence: {
        decision,
        propagationMode,
        moveTargetCount,
        validationTargetCount,
        rewriteCount,
        normalizationAction,
        normalizationSafetyLevel,
        driftState,
        namingDriftState
      }
    };
  }

  const contractMismatch = (
    (moveTargetCount > 0 && validationTargetCount < moveTargetCount) ||
    (moveTargetCount > 0 && propagationMode === 'blocked') ||
    (normalizationAction === 'execute' && normalizationSafetyLevel === 'missing') ||
    (normalizationAction === 'execute' && normalizationSafetyLevel === 'risky') ||
    (decision !== 'already_folderized' && driftState === 'blocked')
  );
  const softMismatch = (
    namingDriftState === 'blocked' ||
    driftState === 'stale' ||
    normalizationSafetyLevel === 'risky' ||
    rewriteCount > 0 && validationTargetCount === 0
  );

  if (contractMismatch) {
    return {
      state: 'blocked',
      score: 100,
      reason: 'Folderization workflow contract is blocked because plan, validation, settlement and rollback are not aligned.',
      recommendation: recommendation?.message || 'Keep plan, validation, settlement and rollback on the canonical folderization transaction pipeline.',
      evidence: {
        decision,
        propagationMode,
        moveTargetCount,
        validationTargetCount,
        rewriteCount,
        normalizationAction,
        normalizationSafetyLevel,
        driftState,
        namingDriftState
      }
    };
  }

  if (softMismatch) {
    return {
      state: 'stale',
      score: 55,
      reason: 'Folderization workflow contract is drifting because the mutation surfaces are not fully aligned.',
      recommendation: recommendation?.message || 'Normalize the folderization workflow contract before executing more moves.',
      evidence: {
        decision,
        propagationMode,
        moveTargetCount,
        validationTargetCount,
        rewriteCount,
        normalizationAction,
        normalizationSafetyLevel,
        driftState,
        namingDriftState
      }
    };
  }

  return {
    state: 'fresh',
    score: 0,
    reason: 'Folderization workflow contract is aligned.',
    recommendation: recommendation?.message || 'Keep folderization plan, validation, settlement and rollback on the canonical pipeline.',
    evidence: {
      decision,
      propagationMode,
      moveTargetCount,
      validationTargetCount,
      rewriteCount,
      normalizationAction,
      normalizationSafetyLevel,
      driftState,
      namingDriftState
    }
  };
}

export { buildFolderizationDriftSignal, buildFolderizationContractDriftSignal };

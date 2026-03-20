function toCount(value = 0) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function hasLiveRowDrift(summary = {}) {
  return (summary?.staleAtomRows || 0) > 0
    || (summary?.staleFileRows || 0) > 0
    || (summary?.staleRiskRows || 0) > 0
    || (summary?.staleRelationRows || 0) > 0
    || (summary?.staleConnectionRows || 0) > 0;
}

export function countLiveRowDeletes(deleted = {}) {
  return toCount(deleted.atoms)
    + toCount(deleted.files)
    + toCount(deleted.riskAssessments)
    + toCount(deleted.relations)
    + toCount(deleted.connections);
}

export function runLiveRowCleanup(db, before, { autoSync, sampleLimit }, executeLiveRowCleanup) {
  if (!autoSync || !hasLiveRowDrift(before?.summary)) {
    return {
      cleanup: { dryRun: true, deleted: { atoms: 0, files: 0, riskAssessments: 0, relations: 0, connections: 0 } },
      cleanupError: null
    };
  }

  try {
    return {
      cleanup: executeLiveRowCleanup(db, { dryRun: false, sampleLimit }),
      cleanupError: null
    };
  } catch (error) {
    return {
      cleanup: { dryRun: true, deleted: { atoms: 0, files: 0, riskAssessments: 0, relations: 0, connections: 0 } },
      cleanupError: { message: error?.message || 'Live-row sync failed', code: 'LIVE_ROW_SYNC_FAILED' }
    };
  }
}

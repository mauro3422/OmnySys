import { asNumber } from '../core-utils.js';

function computeTelemetryDeltas(before = {}, after = {}) {
  const alertClearance = before.watcherAlertCount - after.watcherAlertCount;
  const errorClearance = before.recentErrorCount - after.recentErrorCount;
  const warningClearance = before.recentWarningCount - after.recentWarningCount;
  const issueClearance = before.issueCount - after.issueCount;
  const structuralClearance = before.structuralGroups - after.structuralGroups;
  const conceptualClearance = before.conceptualGroups - after.conceptualGroups;
  const orphanClearance = before.pipelineOrphans - after.pipelineOrphans;
  const driftClearance = before.driftScore - after.driftScore;
  const successDelta = after.successScore - before.successScore;

  return {
    alertClearance,
    errorClearance,
    warningClearance,
    issueClearance,
    structuralClearance,
    conceptualClearance,
    orphanClearance,
    driftClearance,
    successDelta,
    repairScore: Number((
      successDelta +
      (alertClearance * 2) +
      (errorClearance * 4) +
      (warningClearance * 1) +
      (issueClearance * 0.5) +
      (structuralClearance * 1.5) +
      (conceptualClearance * 1.5) +
      (orphanClearance * 2) +
      (driftClearance * 0.5)
    ).toFixed(2))
  };
}

export { computeTelemetryDeltas };

import { isObservationOnlyTool } from './noise-classifier.js';

function classifyTelemetryRepair(before = {}, after = {}, success = true, deltas = {}, context = {}) {
  const {
    alertClearance,
    errorClearance,
    warningClearance,
    issueClearance,
    structuralClearance,
    conceptualClearance,
    orphanClearance,
    driftClearance,
    successDelta,
    repairScore
  } = deltas;

  const observationOnly = isObservationOnlyTool(context?.toolName, context?.captureSource);
  const hadPressure = !observationOnly && (
    before.watcherAlertCount > 0 ||
    before.recentErrorCount > 0 ||
    before.issueCount > 0 ||
    before.driftScore > 0
  );
  const repaired = success && hadPressure && (
    alertClearance > 0 ||
    errorClearance > 0 ||
    warningClearance > 0 ||
    issueClearance > 0 ||
    structuralClearance > 0 ||
    conceptualClearance > 0 ||
    orphanClearance > 0 ||
    driftClearance > 0 ||
    successDelta > 0
  );
  const thrashing = success && hadPressure && (
    (after.watcherAlertCount >= before.watcherAlertCount && after.recentErrorCount >= before.recentErrorCount) ||
    successDelta < 0
  ) && !repaired;

  return {
    hadPressure,
    repaired,
    thrashing,
    repairStatus: !success
      ? 'failed'
      : repaired
        ? 'repaired'
        : thrashing
          ? 'thrashing'
          : 'stable',
    repairScore,
    successThresholdMet: after.mvpReady === true
  };
}

export { classifyTelemetryRepair };

/**
 * @fileoverview Canonical provenance/freshness helpers for compiler telemetry.
 *
 * Provides a compact explanation of where a metric came from, whether runtime
 * restart is pending, and whether global telemetry is fresh enough to trust.
 *
 * @module shared/compiler/telemetry-provenance
 */

export function buildTelemetryProvenance({
  source = 'unknown',
  phase2PendingFiles = 0,
  runtimeRestartMode = 'manual',
  pendingRuntimeRestartFiles = [],
  liveRowSync = null,
  watcherLifecycle = null
} = {}) {
  const pendingFiles = Array.isArray(pendingRuntimeRestartFiles) ? pendingRuntimeRestartFiles : [];
  const settling = Number(phase2PendingFiles || 0) > 0;
  const runtimeCodeFreshness = buildRuntimeCodeFreshness({
    runtimeRestartMode,
    pendingRuntimeRestartFiles: pendingFiles
  });
  const restartPending = runtimeCodeFreshness.restartRequired;
  const liveRowSummary = liveRowSync?.summary || null;

  return {
    source,
    freshness: {
      phase2Settling: settling,
      runtimeRestartMode,
      restartPending,
      pendingRuntimeRestartFiles: pendingFiles.slice(0, 10),
      runtimeCodeFresh: runtimeCodeFreshness.runtimeCodeFresh,
      staleToolModules: runtimeCodeFreshness.staleToolModules,
      liveRowSynchronized: Boolean(liveRowSummary) ? ((liveRowSummary.staleFileRows || 0) === 0 && (liveRowSummary.staleRiskRows || 0) === 0) : null,
      watcherLifecycle: watcherLifecycle || null
    },
    runtimeCodeFreshness,
    trustHints: [
      settling ? 'Global telemetry is still settling because Phase 2 work is pending.' : 'Phase 2 telemetry is settled.',
      runtimeCodeFreshness.summary,
      liveRowSummary
        ? ((liveRowSummary.staleFileRows || 0) === 0 && (liveRowSummary.staleRiskRows || 0) === 0
          ? 'Support tables are synchronized with live atoms.'
          : 'Support tables still contain stale rows.')
        : 'Live-row synchronization was not evaluated for this payload.'
    ]
  };
}

export function buildRuntimeCodeFreshness({
  runtimeRestartMode = 'manual',
  pendingRuntimeRestartFiles = []
} = {}) {
  const pendingFiles = Array.isArray(pendingRuntimeRestartFiles) ? pendingRuntimeRestartFiles : [];
  const staleToolModules = pendingFiles.slice(0, 20);
  const restartRequired = staleToolModules.length > 0;

  return {
    runtimeRestartMode,
    runtimeCodeFresh: !restartRequired,
    restartRequired,
    staleToolModules,
    summary: restartRequired
      ? `Runtime code is stale for ${staleToolModules.length} module(s); restart is required to load the latest tool/runtime code.`
      : 'Runtime code is fresh for the currently loaded tool/runtime modules.'
  };
}

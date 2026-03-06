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
  const restartPending = pendingFiles.length > 0;
  const liveRowSummary = liveRowSync?.summary || null;

  return {
    source,
    freshness: {
      phase2Settling: settling,
      runtimeRestartMode,
      restartPending,
      pendingRuntimeRestartFiles: pendingFiles.slice(0, 10),
      liveRowSynchronized: Boolean(liveRowSummary) ? ((liveRowSummary.staleFileRows || 0) === 0 && (liveRowSummary.staleRiskRows || 0) === 0) : null,
      watcherLifecycle: watcherLifecycle || null
    },
    trustHints: [
      settling ? 'Global telemetry is still settling because Phase 2 work is pending.' : 'Phase 2 telemetry is settled.',
      restartPending ? 'Runtime code changed and a manual restart is still pending.' : 'No runtime restart is pending.',
      liveRowSummary
        ? ((liveRowSummary.staleFileRows || 0) === 0 && (liveRowSummary.staleRiskRows || 0) === 0
          ? 'Support tables are synchronized with live atoms.'
          : 'Support tables still contain stale rows.')
        : 'Live-row synchronization was not evaluated for this payload.'
    ]
  };
}


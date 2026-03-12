/**
 * @fileoverview Canonical helpers for MCP session/restart lifecycle state.
 *
 * @module shared/compiler/session-restart-lifecycle
 */

export function buildCompilerReadinessStatus({
  phase2PendingFiles = 0,
  societiesCount = 0,
  runtimeSessions = 0,
  persistentActive = 0,
  clientsWithDuplicates = 0
} = {}) {
  const input = arguments[0] || {};
  const actionableDuplicateClients = input.actionableDuplicateClients ?? clientsWithDuplicates;
  const toleratedDuplicateClients = input.toleratedDuplicateClients ?? 0;
  const checks = {
    phase2Complete: phase2PendingFiles === 0,
    societiesReady: societiesCount > 0,
    dedupHealthy: actionableDuplicateClients === 0,
    sessionCountsAligned: persistentActive >= runtimeSessions
  };

  const warnings = [];
  if (!checks.phase2Complete) warnings.push(`Phase 2 still pending for ${phase2PendingFiles} files`);
  if (!checks.societiesReady) warnings.push('Society extraction has not produced persisted rows yet');
  if (!checks.dedupHealthy) {
    warnings.push(`${actionableDuplicateClients} clients still have duplicated active sessions`);
  }
  if (!checks.sessionCountsAligned) {
    warnings.push(`Runtime sessions (${runtimeSessions}) exceed persistent active rows (${persistentActive})`);
  }
  if (toleratedDuplicateClients > 0) {
    warnings.push(`${toleratedDuplicateClients} duplicate client buckets are tolerated for known IDE bridges`);
  }

  return {
    ready: checks.phase2Complete && checks.societiesReady && checks.dedupHealthy && checks.sessionCountsAligned,
    checks,
    warnings
  };
}

export function buildRestartLifecycleGuidance({
  restartType = 'component_restart',
  proxyMode = false,
  clearCache = false,
  reanalyze = false,
  reindexOnly = false,
  clearCacheOnly = false
} = {}) {
  const actions = [];

  if (clearCacheOnly) {
    actions.push('Retry tool calls immediately after the cache flush completes.');
  } else if (reindexOnly) {
    actions.push('Use file/atom-level queries while Phase 2 recomputes global metrics.');
  } else if (proxyMode) {
    actions.push('Expect a short bridge recovery window while the worker restarts.');
    actions.push('If a tool fails with a retryable daemon-restarting error, retry after a few seconds.');
  } else {
    actions.push('This restart only refreshed in-process components; true ESM cache was not cleared.');
  }

  if (reanalyze) {
    actions.push('Wait for Layer A and Phase 2 to settle before trusting global metrics.');
  }

  if (clearCache) {
    actions.push('Expect caches and derived metadata to be repopulated on the next requests.');
  }

  return {
    restartType,
    proxyManaged: proxyMode,
    requiresClientPatience: proxyMode && !clearCacheOnly && !reindexOnly,
    recommendedActions: actions,
    summary: proxyMode
      ? 'Proxy-managed restart will briefly interrupt MCP traffic while the worker respawns.'
      : 'Standalone restart refreshed in-process state only.'
  };
}

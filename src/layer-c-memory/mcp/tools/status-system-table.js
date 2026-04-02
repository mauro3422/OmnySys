/**
 * Compact control-plane table for get_server_status.
 */

function formatCount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildSystemTableSummary(status = {}) {
  if (!status || typeof status !== 'object') {
    return null;
  }

  const databaseHealth = status.databaseHealth || {};
  const metricsSnapshot = status.metricsSnapshot || {};
  const current = metricsSnapshot.current || {};
  const daily = metricsSnapshot.daily || null;
  const lifetime = metricsSnapshot.lifetime || null;
  const mcpSessions = status.background?.mcpSessionSummary || status.mcpSessions || {};
  const watcher = status.watcher || {};
  const toolInventory = status.toolInventory || {};
  const structuralGroups = formatCount(current.structuralGroups);
  const conceptualGroups = formatCount(current.conceptualGroups);
  const totalDuplicates = structuralGroups + conceptualGroups;
  const healthGrade = databaseHealth.grade || current.healthGrade || 'F';
  const healthScore = formatCount(databaseHealth.healthScore || current.healthScore);
  const snapshotState = daily && lifetime
    ? 'daily + lifetime'
    : daily
      ? 'daily'
      : lifetime
        ? 'lifetime'
        : 'live only';

  return {
    title: 'Control Plane',
    rows: [
      {
        area: 'Daemon',
        state: status.initialized ? 'ready' : 'starting',
        detail: `telemetry=${status.telemetryMode || 'unknown'} | project=${status.project || 'n/a'}`,
        source: 'mcp-http-server'
      },
      {
        area: 'Database',
        state: databaseHealth.healthy ? `healthy ${healthScore}/${healthGrade}` : `degraded ${healthScore}/${healthGrade}`,
        detail: databaseHealth.summary || 'Canonical DB health surface',
        source: 'get_schema(type:"database")'
      },
      {
        area: 'Snapshots',
        state: snapshotState,
        detail: daily
          ? `daily ${daily.healthScore || 0}/${daily.healthGrade || 'F'} | lifetime ${lifetime?.snapshotsRecorded || 0} snaps`
          : lifetime
            ? `lifetime ${lifetime.snapshotsRecorded || 0} snaps`
            : 'snapshot persistence not loaded',
        source: '.omnysysdata/health-history.db'
      },
      {
        area: 'Behavior',
        state: current.behaviorState || 'unknown',
        detail: `blockers=${formatCount(current.behaviorGateSummary?.blockerCount || current.behaviorBlockers?.length || 0)} | primary=${current.primaryBehaviorBlocker?.gate || current.behaviorGateSummary?.primaryBlocker?.gate || 'n/a'} | reason=${current.readinessReason || 'n/a'}`,
        source: 'behavior gate summary'
      },
      {
        area: 'Debt',
        state: (current.issueCount > 0 || totalDuplicates > 0 || formatCount(current.pipelineOrphans) > 0 || formatCount(current.namingDebt) > 0) ? 'watching' : 'quiet',
        detail: `issues=${formatCount(current.issueCount)} | dups=${totalDuplicates} | orphans=${formatCount(current.pipelineOrphans)} | naming=${formatCount(current.namingDebt)}`,
        source: 'technical_debt_report + compiler snapshot'
      },
      {
        area: 'Sessions',
        state: current.clientSyncState || mcpSessions.clientSyncState || 'fresh',
        detail: `persistent=${formatCount(mcpSessions.totalPersistentActive || mcpSessions.totalPersistent || 0)} active / ${formatCount(mcpSessions.totalPersistent || 0)} total | clients=${formatCount(mcpSessions.uniqueClients || 0)}`,
        source: 'mcp_sessions'
      },
      {
        area: 'Tools',
        state: `${formatCount(toolInventory.totalTools)} tools`,
        detail: `dominant=${toolInventory.dominantCategory || 'n/a'} | concentration=${formatCount(toolInventory.concentration)}`,
        source: 'tool inventory'
      },
      {
        area: 'Watcher',
        state: watcher.isRunning === false ? 'stopped' : 'running',
        detail: `pending=${formatCount(watcher.pendingChanges)} | failed=${formatCount(watcher.failedChanges)} | last=${watcher.lastChangeOrigin || 'n/a'}`,
        source: 'file watcher'
      },
      {
        area: 'Drift',
        state: current.driftState || current.activeAtomsDriftState || 'n/a',
        detail: `drift=${formatCount(current.driftScore)} | blockers=${(current.behaviorGateSummary?.blockedBy || current.behaviorBlockers || []).slice(0, 2).map((item) => item.gate || 'gate').join(',') || 'none'} | readiness=${current.readinessReason || 'n/a'}`,
        source: 'drift assessment'
      },
      ...(status.cachePolicy ? [
        {
          area: 'Cache',
          state: status.cachePolicy.decision || (status.cachePolicy.stableSnapshot ? 'snapshot-led' : status.cachePolicy.confidence || 'watchful'),
          detail: `${status.cachePolicy.whereToCache?.length || status.cachePolicy.targets?.length || 0} cache targets | no-cache=${status.cachePolicy.whereNotToCache?.length || 0} | hot=${status.cachePolicy.hotPathDetected ? 'yes' : 'no'} | thrash=${status.cachePolicy.signals?.metrics?.toolTelemetry?.thrashingRuns || 0} | recent=${status.cachePolicy.signals?.recentErrors?.errors || 0} err`,
          source: 'cache policy advisor'
        }
      ] : [])
    ]
  };
}

export default {
  buildSystemTableSummary
};

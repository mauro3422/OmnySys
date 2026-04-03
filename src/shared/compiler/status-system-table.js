/**
 * Canonical control-plane table for get_server_status.
 */

import { normalizeCount } from './contract-helpers.js';
import { buildUpdateSurfaceSummary } from './update-surface-summary.js';
import { compactWatcherSummary, compactToolInventory } from './status-summary-helpers.js';

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
  const watcher = compactWatcherSummary(status.watcher) || {};
  const toolInventory = compactToolInventory(status.toolInventory) || {};
  const recentErrorSummary = status.recentErrors?.summary || {};
  const updateSurface = buildUpdateSurfaceSummary(status);
  const propagationExpansion = status.compilerExplainability?.driftAssessment?.signals?.find((signal) => signal?.key === 'propagation_expansion')
    || (status.compilerExplainability?.driftAssessment?.primaryIssue?.key === 'propagation_expansion' ? status.compilerExplainability.driftAssessment.primaryIssue : null);
  const structuralGroups = normalizeCount(current.structuralGroups);
  const conceptualGroups = normalizeCount(current.conceptualGroups);
  const totalDuplicates = structuralGroups + conceptualGroups;
  const healthGrade = databaseHealth.grade || current.healthGrade || 'F';
  const healthScore = normalizeCount(databaseHealth.healthScore || current.healthScore);
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
        area: 'Update',
        state: updateSurface?.state || 'unknown',
        detail: updateSurface?.detail || 'update pipeline not loaded',
        source: updateSurface?.source || 'atom/function update pipeline'
      },
      {
        area: 'Behavior',
        state: current.behaviorState || 'unknown',
        detail: `blockers=${normalizeCount(current.behaviorGateSummary?.blockerCount || current.behaviorBlockers?.length || 0)} | primary=${current.primaryBehaviorBlocker?.gate || current.behaviorGateSummary?.primaryBlocker?.gate || 'n/a'} | reason=${current.readinessReason || 'n/a'}`,
        source: 'behavior gate summary'
      },
      {
        area: 'Drift',
        state: current.driftState || current.activeAtomsDriftState || 'n/a',
        detail: `drift=${normalizeCount(current.driftScore)} | blockers=${(current.behaviorGateSummary?.blockedBy || current.behaviorBlockers || []).slice(0, 2).map((item) => item.gate || 'gate').join(',') || 'none'} | readiness=${current.readinessReason || 'n/a'}`,
        source: 'drift assessment'
      },
      {
        area: 'Propagation',
        state: propagationExpansion?.state || 'fresh',
        detail: `signal=${propagationExpansion?.state || 'fresh'} | reason=${propagationExpansion?.reason || 'canonical propagation is attached'} | next=${propagationExpansion?.recommendation || 'n/a'}`,
        source: 'compiler drift assessment'
      },
      {
        area: 'Debt',
        state: (current.issueCount > 0 || totalDuplicates > 0 || normalizeCount(current.pipelineOrphans) > 0 || normalizeCount(current.namingDebt) > 0) ? 'watching' : 'quiet',
        detail: `issues=${normalizeCount(current.issueCount)} | dups=${totalDuplicates} | orphans=${normalizeCount(current.pipelineOrphans)} | naming=${normalizeCount(current.namingDebt)}`,
        source: 'technical_debt_report + compiler snapshot'
      },
      {
        area: 'Sessions',
        state: current.clientSyncState || mcpSessions.clientSyncState || 'fresh',
        detail: `persistent=${normalizeCount(mcpSessions.totalPersistentActive || mcpSessions.totalPersistent || 0)} active / ${normalizeCount(mcpSessions.totalPersistent || 0)} total | clients=${normalizeCount(mcpSessions.uniqueClients || 0)}`,
        source: 'mcp_sessions'
      },
      {
        area: 'Tools',
        state: `${normalizeCount(toolInventory.totalTools)} tools`,
        detail: `dominant=${toolInventory.dominantCategory?.category || toolInventory.dominantCategory || 'n/a'} | subgroup=${toolInventory.dominantSubgroup?.subgroup || 'n/a'} | category=${normalizeCount(toolInventory.categoryConcentration)} | concentration=${normalizeCount(toolInventory.concentration)}`,
        source: 'tool inventory'
      },
      {
        area: 'Systems',
        state: status.systemInventory?.inventoryState || status.systemInventory?.summary?.inventoryState || 'watching',
        detail: `canonical=${normalizeCount((status.systemInventory?.canonicalSurfaceCount || status.systemInventory?.summary?.canonicalSurfaceCount || 0) + (status.systemInventory?.canonicalEntrypointCount || status.systemInventory?.summary?.canonicalEntrypointCount || 0))} | emergent=${normalizeCount(status.systemInventory?.emergentSystemCount || status.systemInventory?.summary?.emergentSystemCount)} | bridge=${normalizeCount(status.systemInventory?.bridgeSystemCount || status.systemInventory?.summary?.bridgeSystemCount)} | wrapper=${normalizeCount(status.systemInventory?.wrapperSystemCount || status.systemInventory?.summary?.wrapperSystemCount)} | audit=${status.systemInventory?.surfaceAuditTrustworthy === true ? 'ok' : 'watching'} | gateway=${status.systemInventory?.dataGatewayTrustworthy === true ? 'ok' : 'watching'} | meta=${normalizeCount(status.systemInventory?.metadataCoveragePct || status.systemInventory?.summary?.metadataCoveragePct)}% | next=${status.systemInventory?.nextAction || status.systemInventory?.summary?.nextAction || 'n/a'}`,
        source: 'system inventory'
      },
      ...(status.cachePolicy ? [
        {
          area: 'Cache',
          state: status.cachePolicy.decision || (status.cachePolicy.stableSnapshot ? 'snapshot-led' : status.cachePolicy.confidence || 'watchful'),
          detail: `${status.cachePolicy.whereToCache?.length || status.cachePolicy.targets?.length || 0} cache targets | no-cache=${status.cachePolicy.whereNotToCache?.length || 0} | hot=${status.cachePolicy.hotPathDetected ? 'yes' : 'no'} | thrash=${status.cachePolicy.signals?.metrics?.toolTelemetry?.thrashingRuns || 0} | noise=${status.cachePolicy.signals?.metrics?.toolTelemetry?.noiseSummary?.noiseScore || 0} | noisyTools=${status.cachePolicy.signals?.metrics?.toolTelemetry?.noiseSummary?.noisyToolCount || 0} | tiers=l:${status.cachePolicy.signals?.metrics?.toolTelemetry?.cachePolicySummary?.tierCounts?.live || 0}/fp:${status.cachePolicy.signals?.metrics?.toolTelemetry?.cachePolicySummary?.tierCounts?.fingerprintCache || 0}/snap:${status.cachePolicy.signals?.metrics?.toolTelemetry?.cachePolicySummary?.tierCounts?.snapshotCache || 0}/ttl:${status.cachePolicy.signals?.metrics?.toolTelemetry?.cachePolicySummary?.tierCounts?.ttlCache || 0} | recent=${status.cachePolicy.signals?.recentErrors?.errors || 0} err`,
          source: 'cache policy advisor'
        }
      ] : []),
      {
        area: 'Watcher',
        state: watcher.isRunning === false ? 'stopped' : 'running',
        detail: `pending=${normalizeCount(watcher.pendingChanges)} | failed=${normalizeCount(watcher.failedChanges)} | last=${watcher.lastChangeOrigin || 'n/a'}`,
        source: 'file watcher'
      },
      {
        area: 'Errors',
        state: normalizeCount(recentErrorSummary.errors) > 0 || normalizeCount(recentErrorSummary.warnings) > 0 ? 'watching' : 'clear',
        detail: `warnings=${normalizeCount(recentErrorSummary.warnings)} | errors=${normalizeCount(recentErrorSummary.errors)} | total=${normalizeCount(recentErrorSummary.total)}`,
        source: 'recent_errors'
      }
    ]
  };
}

export default {
  buildSystemTableSummary
};

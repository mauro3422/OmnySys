/**
 * Canonical control-plane table for get_server_status.
 */

import { normalizeCount } from './contract-helpers.js';
import { buildUpdateSurfaceSummary } from './update-surface-summary.js';
import {
  compactWatcherSummary,
  compactToolInventory,
  resolveControlPlaneContracts,
  resolvePolicyCoverageSummary
} from './status-summary-helpers.js';

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
  const controlPlaneContracts = resolveControlPlaneContracts(status);
  const policyCoverage = controlPlaneContracts.policyCoverage || resolvePolicyCoverageSummary(status);
  const folderizationAutomation = controlPlaneContracts.folderizationAutomation || status.compilerExplainability?.folderization?.automation || null;
  const folderizationAdoption = controlPlaneContracts.folderizationAdoption
    || folderizationAutomation?.propagationAdoption
    || status.compilerExplainability?.folderization?.automation?.propagationAdoption
    || null;
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
        area: 'Startup',
        state: current.startupTelemetry?.state || 'unknown',
        detail: current.startupTelemetry
          ? `mode=${current.startupTelemetry.layerAStrategy || 'n/a'} | total=${normalizeCount(current.startupTelemetry.totalDurationMs || 0)}ms | budget=${current.startupTelemetry.budgetState || 'n/a'} | reason=${current.startupTelemetry.reason || 'n/a'}`
          : 'startup telemetry not available',
        source: 'bootstrap startup telemetry'
      },
      {
        area: 'Proxy',
        state: status.proxyRuntimeTelemetry?.state || 'unknown',
        detail: status.proxyRuntimeTelemetry
          ? `restarts=${normalizeCount(status.proxyRuntimeTelemetry.restartCount || 0)} | crashes=${normalizeCount(status.proxyRuntimeTelemetry.crashCount || 0)} | exits=${normalizeCount(status.proxyRuntimeTelemetry.unexpectedExitCount || 0)} | clean=${normalizeCount(status.proxyRuntimeTelemetry.cleanExitCount || 0)} | last=${status.proxyRuntimeTelemetry.lastEventType || 'n/a'}`
          : 'proxy runtime telemetry not available',
        source: '.omnysysdata/proxy-runtime-telemetry.json'
      },
      {
        area: 'Bridge',
        state: status.bridgeRuntimeTelemetry?.state || 'unknown',
        detail: status.bridgeRuntimeTelemetry
          ? `connects=${normalizeCount(status.bridgeRuntimeTelemetry.connectCount || 0)} | reconnects=${normalizeCount(status.bridgeRuntimeTelemetry.reconnectCount || 0)} | closed=${normalizeCount(status.bridgeRuntimeTelemetry.transportClosedCount || 0)} | expired=${normalizeCount(status.bridgeRuntimeTelemetry.sessionExpiredCount || 0)} | retryable=${normalizeCount(status.bridgeRuntimeTelemetry.retryableErrorCount || 0)} | stdioClose=${normalizeCount(status.bridgeRuntimeTelemetry.stdioCloseCount || 0)} | last=${status.bridgeRuntimeTelemetry.lastEventType || 'n/a'}`
          : 'bridge runtime telemetry not available',
        source: '.omnysysdata/bridge-runtime-telemetry.json'
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
        state: controlPlaneContracts.systemInventory?.inventoryState || controlPlaneContracts.systemInventory?.summary?.inventoryState || 'watching',
        detail: `canonical=${normalizeCount((controlPlaneContracts.systemInventory?.canonicalSurfaceCount || controlPlaneContracts.systemInventory?.summary?.canonicalSurfaceCount || 0) + (controlPlaneContracts.systemInventory?.canonicalEntrypointCount || controlPlaneContracts.systemInventory?.summary?.canonicalEntrypointCount || 0))} | emergent=${normalizeCount(controlPlaneContracts.systemInventory?.emergentSystemCount || controlPlaneContracts.systemInventory?.summary?.emergentSystemCount)} | bridge=${normalizeCount(controlPlaneContracts.systemInventory?.bridgeSystemCount || controlPlaneContracts.systemInventory?.summary?.bridgeSystemCount)} | wrapper=${normalizeCount(controlPlaneContracts.systemInventory?.wrapperSystemCount || controlPlaneContracts.systemInventory?.summary?.wrapperSystemCount)} | audit=${controlPlaneContracts.systemInventory?.surfaceAuditTrustworthy === true ? 'ok' : 'watching'} | gateway=${controlPlaneContracts.systemInventory?.dataGatewayTrustworthy === true ? 'ok' : 'watching'} | meta=${normalizeCount(controlPlaneContracts.systemInventory?.metadataCoveragePct || controlPlaneContracts.systemInventory?.summary?.metadataCoveragePct)}% | integration=${normalizeCount(controlPlaneContracts.integrationCoveragePct || 0)}% | next=${controlPlaneContracts.systemInventory?.nextAction || controlPlaneContracts.systemInventory?.summary?.nextAction || 'n/a'}`,
        source: 'system inventory'
      },
      {
        area: 'Aduana',
        state: policyCoverage?.state || 'watching',
        detail: policyCoverage
          ? `score=${policyCoverage.score} | drift=${policyCoverage.drift} | expansion=${policyCoverage.expansion} | coverage=${policyCoverage.coveragePercent} | integration=${normalizeCount(policyCoverage.integrationCoveragePct || controlPlaneContracts.integrationCoveragePct || 0)}% | meta=${normalizeCount(policyCoverage.metadataCoveragePct || 0)}% | next=${policyCoverage.nextAction}`
          : 'policy coverage gate not loaded',
        source: 'system inventory policy coverage'
      },
      {
        area: 'Promotion',
        state: controlPlaneContracts.canonicalPromotion?.promotionState || controlPlaneContracts.canonicalPromotion?.summary?.promotionState || 'watching',
        detail: `candidates=${normalizeCount(controlPlaneContracts.canonicalPromotion?.candidateCount || controlPlaneContracts.canonicalPromotion?.summary?.candidateCount || 0)} | folder=${normalizeCount(controlPlaneContracts.canonicalPromotion?.folderizedFamilyCount || controlPlaneContracts.canonicalPromotion?.summary?.folderizedFamilyCount || 0)} | emergent=${normalizeCount(controlPlaneContracts.canonicalPromotion?.emergentCandidateCount || controlPlaneContracts.canonicalPromotion?.summary?.emergentCandidateCount || 0)} | canonical=${normalizeCount(controlPlaneContracts.canonicalPromotion?.canonicalCandidateCount || controlPlaneContracts.canonicalPromotion?.summary?.canonicalCandidateCount || 0)} | next=${controlPlaneContracts.canonicalPromotion?.nextAction || controlPlaneContracts.canonicalPromotion?.summary?.nextAction || 'n/a'}`,
        source: 'canonical promotion'
      },
      {
        area: 'Automation',
        state: folderizationAutomation?.automationState || 'watching',
        detail: folderizationAutomation
          ? `mode=${folderizationAutomation.executionMode || 'n/a'} | exec=${folderizationAutomation.shouldExecute ? 'yes' : 'no'} | target=${folderizationAutomation.executionTarget || 'n/a'} | confidence=${normalizeCount(folderizationAutomation.confidence || 0)} | risk=${normalizeCount(folderizationAutomation.riskScore || 0)} | systems=${normalizeCount(folderizationAutomation.connectedSystemCount || 0)} | next=${folderizationAutomation.nextAction || 'n/a'}`
          : 'folderization automation not available',
        source: 'folderization automation plan'
      },
      {
        area: 'Adoption',
        state: folderizationAdoption?.adoptionState || 'watching',
        detail: folderizationAdoption
          ? `required=${normalizeCount(folderizationAdoption.requiredSystemCount || 0)} | surfaced=${normalizeCount(folderizationAdoption.surfacedSystemCount || 0)} | missing=${normalizeCount(folderizationAdoption.missingSystemCount || 0)} | coverage=${normalizeCount(Math.round((folderizationAdoption.coverageRatio || 0) * 100))}% | missingNames=${(folderizationAdoption.missingSystemNames || []).slice(0, 3).join(', ') || 'none'} | next=${folderizationAdoption.nextAction || 'n/a'}`
          : 'folderization adoption not available',
        source: 'folderization propagation adoption'
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

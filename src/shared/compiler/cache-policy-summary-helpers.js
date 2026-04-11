import { asNumber } from './core-utils.js';
import { takeSample } from './sample-helpers.js';
import { buildToolCachePolicySummary } from './tool-run-telemetry/index.js';

export function summarizeRecentErrors(recentErrors = null) {
  if (!recentErrors || typeof recentErrors !== 'object') {
    return null;
  }

  return {
    total: recentErrors.summary?.total || 0,
    warnings: recentErrors.summary?.warnings || 0,
    errors: recentErrors.summary?.errors || 0,
    activeAlerts: takeSample(recentErrors.watcherAlerts || [], 3).map((alert) => ({
      level: alert.level || 'warn',
      severity: alert.severity || 'medium',
      issueType: alert.issueType || 'unknown',
      filePath: alert.filePath || null,
      message: alert.message || null
    }))
  };
}

export function summarizeToolTelemetry(toolTelemetry = null) {
  if (!toolTelemetry || typeof toolTelemetry !== 'object') {
    return null;
  }

  const cachePolicySummary = toolTelemetry.cachePolicySummary
    ? {
        totalTools: asNumber(toolTelemetry.cachePolicySummary.totalTools, 0),
        tierCounts: {
          live: asNumber(toolTelemetry.cachePolicySummary.tierCounts?.live, 0),
          fingerprintCache: asNumber(toolTelemetry.cachePolicySummary.tierCounts?.fingerprintCache, 0),
          snapshotCache: asNumber(toolTelemetry.cachePolicySummary.tierCounts?.snapshotCache, 0),
          ttlCache: asNumber(toolTelemetry.cachePolicySummary.tierCounts?.ttlCache, 0)
        },
        topTools: takeSample(toolTelemetry.cachePolicySummary.topTools || [], 5),
        defaultPolicy: toolTelemetry.cachePolicySummary.defaultPolicy || null
      }
    : buildToolCachePolicySummary(
      Array.isArray(toolTelemetry.topTools)
        ? toolTelemetry.topTools.map((tool) => ({
            toolName: tool.toolName || tool.tool_name || null,
            runCount: asNumber(tool.runCount, 0),
            successRate: asNumber(tool.successRate, 0),
            avgDurationMs: asNumber(tool.avgDurationMs, 0),
            avgRepairScore: asNumber(tool.avgRepairScore, 0),
            noiseScore: asNumber(tool.noise?.noiseScore ?? tool.noiseSummary?.noiseScore ?? tool.noiseScore, 0),
            noiseSummary: tool.noiseSummary || tool.noise || null
          }))
        : [],
      {
        totalRuns: asNumber(toolTelemetry.totalRuns, 0),
        noiseSummary: toolTelemetry.noiseSummary || null
      }
    );

  return {
    totalRuns: asNumber(toolTelemetry.totalRuns, 0),
    successfulRuns: asNumber(toolTelemetry.successfulRuns, 0),
    failedRuns: asNumber(toolTelemetry.failedRuns, 0),
    repairedRuns: asNumber(toolTelemetry.repairedRuns, 0),
    thrashingRuns: asNumber(toolTelemetry.thrashingRuns, 0),
    stableRuns: asNumber(toolTelemetry.stableRuns, 0),
    comparableRuns: asNumber(toolTelemetry.comparableRuns, 0),
    observationRuns: asNumber(toolTelemetry.observationRuns, 0),
    pressureRuns: asNumber(toolTelemetry.pressureRuns, 0),
    clearanceRuns: asNumber(toolTelemetry.clearanceRuns, 0),
    repairYield: asNumber(toolTelemetry.repairYield, 0),
    repairRateOnPressure: asNumber(toolTelemetry.repairRateOnPressure, 0),
    observationRate: asNumber(toolTelemetry.observationRate, 0),
    toolSuccessRate: asNumber(toolTelemetry.toolSuccessRate, 0),
    alertClearanceRate: asNumber(toolTelemetry.alertClearanceRate, 0),
    errorClearanceRate: asNumber(toolTelemetry.errorClearanceRate, 0),
    averageDurationMs: asNumber(toolTelemetry.averageDurationMs, 0),
    averageRepairScore: asNumber(toolTelemetry.averageRepairScore, 0),
    lastRunAt: toolTelemetry.lastRunAt || null,
    lastSuccessfulRunAt: toolTelemetry.lastSuccessfulRunAt || null,
    topTools: takeSample(toolTelemetry.topTools || [], 5),
    noiseSummary: toolTelemetry.noiseSummary ? {
      totalRuns: asNumber(toolTelemetry.noiseSummary.totalRuns, 0),
      noisyRunCount: asNumber(toolTelemetry.noiseSummary.noisyRunCount, 0),
      noisyToolCount: asNumber(toolTelemetry.noiseSummary.noisyToolCount, 0),
      noiseRate: asNumber(toolTelemetry.noiseSummary.noiseRate, 0),
      noiseScore: asNumber(toolTelemetry.noiseSummary.noiseScore, 0),
      noiseTopTools: takeSample(toolTelemetry.noiseSummary.noiseTopTools || [], 5),
      topReasons: takeSample(toolTelemetry.noiseSummary.topReasons || [], 5)
    } : null,
    cachePolicySummary
  };
}

export function buildWhereToCache({ current = {}, daily = null, lifetime = null, toolTelemetry = null, stableSnapshot = false }) {
  const hasHotToolTelemetry = asNumber(toolTelemetry?.thrashingRuns, 0) > 0
    || asNumber(toolTelemetry?.averageDurationMs, 0) > 5000
    || asNumber(toolTelemetry?.pressureRuns, 0) > 0
    || asNumber(toolTelemetry?.noiseSummary?.noiseScore, 0) >= 35;

  return [
    {
      surface: 'folderization propagation / propagation-engine',
      layer: 'persistent-snapshot',
      strategy: 'fingerprint cache',
      cacheKey: 'projectPath + scopePath + focusPath + propagationCacheKey',
      invalidateOn: [
        'move target change',
        'impacted file change',
        'rewrite target change',
        'drift change'
      ],
      why: 'Propagation is a derived change plan, so repeated callers should reuse the same plan until the folderization fingerprint changes.',
      priority: 'high',
      freshEnough: stableSnapshot
    },
    {
      surface: 'technical_debt_report',
      layer: 'persistent-snapshot',
      strategy: 'fingerprint cache',
      cacheKey: 'projectPath + scopePath + focusPath + snapshotFingerprint',
      invalidateOn: [
        'snapshotFingerprint change',
        'folderization / naming debt change',
        'duplicate or pipeline-orphan drift'
      ],
      why: 'It rescans duplicates, conceptual groups, orphans and folderization only when the DNA changes.',
      priority: 'high',
      freshEnough: stableSnapshot
    },
    {
      surface: 'compiler_metrics_snapshot',
      layer: 'persistent-daily',
      strategy: 'append-only daily archive',
      cacheKey: 'projectPath + snapshotKind + capturedDay + scopePath + focusPath',
      invalidateOn: [
        'capturedDay rollover',
        'new fingerprint',
        'live-row reconciliation'
      ],
      why: 'It is already the system DNA and lifetime history should survive reindex/reanalyze.',
      priority: 'high',
      freshEnough: !!daily || !!lifetime
    },
    {
      surface: 'aggregate_metrics / pipeline_health / duplicates',
      layer: 'snapshot-derived',
      strategy: 'reuse current snapshot rows first',
      cacheKey: 'currentSnapshotFingerprint',
      invalidateOn: [
        'graph or metadata refresh',
        'phase2PendingFiles > 0',
        'DB drift or live-row sync changes'
      ],
      why: 'These reports are derived from the same canonical surfaces and should not rescan when the snapshot is stable.',
      priority: 'high',
      freshEnough: stableSnapshot
    },
    {
      surface: 'tool_run_telemetry / diagnose_tool_health',
      layer: 'persistent-snapshot',
      strategy: 'windowed summary cache',
      cacheKey: 'projectPath + windowDays + scopePath + focusPath + toolRunFingerprint',
      invalidateOn: [
        'new mcp_tool_runs rows',
        'windowDays change',
        'thrashing / repair-state change'
      ],
      why: 'Tool health trends are cheap to summarize from persisted runs, but the summary should still be invalidated when the run stream changes.',
      priority: hasHotToolTelemetry ? 'high' : 'medium',
      freshEnough: toolTelemetry?.totalRuns > 0
    },
    {
      surface: 'get_server_status',
      layer: 'process-memory',
      strategy: 'short TTL cache',
      cacheKey: 'runtime version + recentErrors hash + session summary version',
      invalidateOn: [
        'recent error / watcher change',
        'session sync change',
        'hot-reload restart'
      ],
      why: 'Useful for UI polling; it should stay fresh but not recompute expensive derived surfaces every call.',
      priority: 'medium',
      freshEnough: true
    }
  ];
}

export function buildWhereNotToCache() {
  return [
    {
      surface: 'databaseHealth / execute_sql',
      layer: 'live-read',
      strategy: 'no long cache',
      why: 'These are freshness gates; keep them live or very short-lived.',
      invalidateOn: ['any write', 'reindex', 'live-row reconciliation'],
      priority: 'high'
    },
    {
      surface: 'recentErrors / watcherAlerts',
      layer: 'live-read',
      strategy: 'ephemeral only',
      why: 'Alert streams must remain current so regressions do not disappear behind stale cache.',
      invalidateOn: ['every logger flush', 'watcher event', 'restart'],
      priority: 'high'
    },
    {
      surface: 'driftAssessment / live-row reconciliation',
      layer: 'control gate',
      strategy: 'short TTL or none',
      why: 'Drift is the control signal; stale drift hides the bug you are trying to catch.',
      invalidateOn: ['schema drift', 'row reconciliation', 'phase2 completion'],
      priority: 'high'
    },
    {
      surface: 'runtime ownership / client sync',
      layer: 'session gate',
      strategy: 'live state only',
      why: 'Connector churn and session sync are operational signals, not stable cache targets.',
      invalidateOn: ['client connect', 'client disconnect', 'session resync'],
      priority: 'medium'
    }
  ];
}

export function buildRecurringHotspots({ recentErrors = null, watcher = null, toolTelemetry = null }) {
  const hotspots = [];

  if (asNumber(recentErrors?.errors, 0) > 0) {
    hotspots.push({
      surface: 'recentErrors',
      signal: 'active error stream',
      count: asNumber(recentErrors?.errors, 0),
      why: 'Errors should keep the panel in freshness-first mode until the stream clears.'
    });
  }

  if (asNumber(watcher?.failedChanges, 0) > 0) {
    hotspots.push({
      surface: 'watcher',
      signal: 'failed changes',
      count: asNumber(watcher?.failedChanges, 0),
      why: 'Watcher failures usually point to stale or mismatched filesystem state.'
    });
  }

  if (asNumber(toolTelemetry?.thrashingRuns, 0) > 0) {
    hotspots.push({
      surface: 'mcp_tool_runs',
      signal: 'thrashing runs',
      count: asNumber(toolTelemetry?.thrashingRuns, 0),
      why: 'Repair loops are the clearest sign that the report should be cached by fingerprint and the failing tool should be watched.'
    });
  }

  if (asNumber(toolTelemetry?.averageDurationMs, 0) > 5000) {
    hotspots.push({
      surface: 'mcp_tool_runs',
      signal: 'slow tool window',
      count: Math.round(asNumber(toolTelemetry?.averageDurationMs, 0)),
      why: 'Slow summaries are the best candidates for snapshot or TTL caching.'
    });
  }

  if (asNumber(toolTelemetry?.noiseSummary?.noiseScore, 0) >= 35) {
    hotspots.push({
      surface: 'mcp_tool_runs',
      signal: 'operational noise',
      count: Math.round(asNumber(toolTelemetry?.noiseSummary?.noiseScore, 0)),
      why: 'Repeated polling, thrash and slow observation are the clearest candidates for noise-aware caching and tool triage.'
    });
  }

  return {
    hotspots,
    topTools: takeSample(toolTelemetry?.topTools || [], 3).map((tool) => ({
      toolName: tool.toolName || null,
      runCount: asNumber(tool.runCount, 0),
      successRate: asNumber(tool.successRate, 0),
      avgRepairScore: asNumber(tool.avgRepairScore, 0),
      lastRunAt: tool.lastRunAt || null,
      noiseSummary: tool.noise || tool.noiseSummary || null
    }))
  };
}

export default {
  buildRecurringHotspots,
  buildWhereNotToCache,
  buildWhereToCache,
  summarizeRecentErrors,
  summarizeToolTelemetry
};

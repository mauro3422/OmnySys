import { asNumber } from '../core-utils.js';
import { normalizeToolName, isObservationOnlyTool } from './noise-classifier.js';

function classifyToolCacheTier(toolStats = {}, context = {}) {
  const toolName = normalizeToolName(toolStats.toolName || toolStats.tool_name || context.toolName || '');
  const observationOnly = isObservationOnlyTool(toolName, toolStats.captureSource || context.captureSource || '');
  const noiseScore = asNumber(toolStats.noiseScore ?? toolStats.noiseSummary?.noiseScore, 0);
  const avgDurationMs = asNumber(toolStats.avgDurationMs ?? toolStats.averageDurationMs ?? toolStats.avg_duration_ms, 0);
  const thrashingCount = asNumber(toolStats.thrashingCount ?? toolStats.thrashingRuns ?? toolStats.thrashing_runs, 0);
  const repairedCount = asNumber(toolStats.repairedCount ?? toolStats.repairedRuns ?? toolStats.repaired_runs, 0);
  const reason = [];

  const isMutationTool = /^(mcp_omnysystem_(restart|atomic_|move_|rename_|split_|folderize_|fix_|validate_imports|validate_exports|save_|repair_|update_|apply_))/i.test(toolName)
    || /(restart|mutation|repair|move|rename|split|folderize|write|save|apply)/i.test(toolName);
  const isMetricsFingerprintTool = /^(mcp_omnysystem_get_metrics_snapshot)$/i.test(toolName);
  const isLiveGateTool = /^(mcp_omnysystem_(execute_sql|get_server_status|get_recent_errors|get_health_snapshot))/i.test(toolName);
  const isHeavyDerivedTool = /^(mcp_omnysystem_(query_graph|traverse_graph|aggregate_metrics|get_technical_debt_report|diagnose_tool_health|check_pipeline_integrity|get_folderization_snapshot|get_update_surface_snapshot))/i.test(toolName);
  const isSnapshotSummaryTool = /^(mcp_omnysystem_(get_health_snapshot|get_server_status|get_recent_errors|status))/i.test(toolName)
    || /(summary|dashboard|snapshot|status)/i.test(toolName);

  if (isMutationTool) {
    reason.push('mutating-or-side-effect');
    return {
      toolName,
      tier: 'live',
      reasons: reason,
      invalidateOn: [
        'any file or DB write',
        'reindex / live-row reconciliation',
        'restart or hot-reload'
      ]
    };
  }

  if (isLiveGateTool) {
    reason.push('freshness-gate');
    return {
      toolName,
      tier: 'live',
      reasons: reason,
      invalidateOn: [
        'any write',
        'watcher event',
        'session sync change'
      ]
    };
  }

  if (isMetricsFingerprintTool) {
    reason.push('snapshot-fingerprint');
    if (avgDurationMs >= 5000) {
      reason.push('slow');
    }
    if (noiseScore >= 35) {
      reason.push('noisy');
    }
    return {
      toolName,
      tier: 'fingerprint-cache',
      reasons: reason,
      invalidateOn: [
        'snapshotFingerprint change',
        'graph / metadata refresh',
        'windowDays change'
      ]
    };
  }

  if (isHeavyDerivedTool) {
    reason.push('heavy-derived');
    if (noiseScore >= 35 || avgDurationMs >= 5000 || thrashingCount > 0) {
      reason.push('expensive-or-noisy');
    }
    return {
      toolName,
      tier: 'fingerprint-cache',
      reasons: reason,
      invalidateOn: [
        'snapshotFingerprint change',
        'graph / metadata refresh',
        'windowDays change'
      ]
    };
  }

  if (isSnapshotSummaryTool || observationOnly) {
    reason.push('observability-summary');
    if (avgDurationMs >= 5000) {
      reason.push('slow');
    }
    if (noiseScore >= 35) {
      reason.push('noisy');
    }
    if (repairedCount > 0 || thrashingCount > 0) {
      reason.push('repair-loop');
    }
    return {
      toolName,
      tier: 'ttl-cache',
      reasons: reason,
      invalidateOn: [
        'recent error / watcher change',
        'session sync change',
        'hot-reload restart'
      ]
    };
  }

  return {
    toolName,
    tier: 'snapshot-cache',
    reasons: ['default-snapshot-derived'],
    invalidateOn: [
      'snapshotFingerprint change',
      'state snapshot update'
    ]
  };
}

function buildToolCachePolicySummary(toolRows = [], totals = {}) {
  const classified = Array.isArray(toolRows)
    ? toolRows.map((row) => {
      const cache = classifyToolCacheTier(row, totals);
      return {
        toolName: row.toolName || row.tool_name || null,
        runCount: asNumber(row.runCount ?? row.run_count, 0),
        successRate: asNumber(row.successRate, 0),
        avgDurationMs: asNumber(row.avgDurationMs ?? row.avg_duration_ms, 0),
        avgRepairScore: asNumber(row.avgRepairScore ?? row.avg_repair_score, 0),
        noiseScore: asNumber(row.noiseScore ?? row.noiseSummary?.noiseScore, 0),
        cacheTier: cache.tier,
        cacheReasons: cache.reasons,
        invalidateOn: cache.invalidateOn
      };
    })
    : [];

  const tierCounts = classified.reduce((acc, row) => {
    acc[row.cacheTier] = (acc[row.cacheTier] || 0) + asNumber(row.runCount, 0);
    return acc;
  }, { live: 0, 'fingerprint-cache': 0, 'snapshot-cache': 0, 'ttl-cache': 0 });

  const topByCost = classified
    .slice()
    .sort((left, right) => {
      const rightScore = asNumber(right.noiseScore, 0) + (asNumber(right.avgDurationMs, 0) / 1000);
      const leftScore = asNumber(left.noiseScore, 0) + (asNumber(left.avgDurationMs, 0) / 1000);
      if (rightScore !== leftScore) return rightScore - leftScore;
      return asNumber(right.runCount, 0) - asNumber(left.runCount, 0);
    })
    .slice(0, 5);

  return {
    totalTools: classified.length,
    tierCounts: {
      live: tierCounts.live || 0,
      fingerprintCache: tierCounts['fingerprint-cache'] || 0,
      snapshotCache: tierCounts['snapshot-cache'] || 0,
      ttlCache: tierCounts['ttl-cache'] || 0
    },
    topTools: topByCost,
    defaultPolicy: {
      live: ['mutating tools', 'freshness gates'],
      fingerprintCache: ['heavy derived graph/debt/pipeline summaries'],
      snapshotCache: ['stable derived snapshots and daily archives'],
      ttlCache: ['status / health / error polling']
    }
  };
}

export {
  classifyToolCacheTier,
  buildToolCachePolicySummary
};

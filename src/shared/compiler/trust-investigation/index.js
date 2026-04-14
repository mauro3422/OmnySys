import { asNumber } from '../core-utils.js';

export const SLOW_TOOL_THRESHOLD_MS = 10000;
export const DEFAULT_SAMPLE_LIMIT = 3;

export function parseJsonValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

export function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function summarizeSnapshotRow(row = null) {
  if (!row) {
    return null;
  }

  return {
    id: row.id || null,
    snapshotKind: row.snapshot_kind || null,
    capturedAt: row.captured_at || null,
    healthScore: asNumber(row.health_score, 0),
    healthGrade: row.health_grade || null,
    issueCount: asNumber(row.issue_count, 0),
    pipelineOrphans: asNumber(row.pipeline_orphans, 0),
    folderizationCandidateCount: asNumber(row.folderization_candidate_count, 0),
    namingDebt: asNumber(row.naming_debt, 0),
    activeAtoms: asNumber(row.active_atoms, 0),
    liveCoverageRatio: asNumber(row.live_coverage_ratio, 0),
    driftState: row.drift_state || null,
    driftScore: asNumber(row.drift_score, 0),
    stabilityScore: asNumber(row.stability_score, 0),
    successScore: asNumber(row.success_score, 0),
    behaviorState: row.behavior_state || null,
    readinessReason: row.readiness_reason || null,
    summaryText: row.summary_text || null
  };
}

export function summarizeIssueRow(row = null) {
  if (!row) {
    return null;
  }

  return {
    filePath: row.file_path || null,
    issueType: row.issue_type || null,
    severity: row.severity || null,
    lifecycleStatus: row.lifecycle_status || null,
    message: row.message || null,
    lineNumber: row.line_number || null,
    updatedAt: row.updated_at || null
  };
}

export function summarizeSystemMetadataRows(rows = []) {
  const valuesByKey = Object.fromEntries(rows.map((row) => [row.key, parseJsonValue(row.value)]));
  const core = valuesByKey.core_metadata && typeof valuesByKey.core_metadata === 'object'
    ? valuesByKey.core_metadata
    : {};

  return {
    rowCount: rows.length,
    keys: rows.map((row) => row.key),
    schemaVersion: valuesByKey.schema_version || null,
    cacheSqliteEnabled: normalizeBoolean(valuesByKey.cache_sqlite_enabled),
    systemMapEnabled: normalizeBoolean(valuesByKey.system_map_enabled),
    updatedAt: rows.reduce((latest, row) => (
      !latest || String(row.updated_at || '') > String(latest)
        ? row.updated_at
        : latest
    ), null),
    coreMetadata: {
      totalFiles: asNumber(core.totalFiles, 0),
      totalDependencies: asNumber(core.totalDependencies, 0),
      totalFunctions: asNumber(core.totalFunctions, 0),
      totalFunctionLinks: asNumber(core.totalFunctionLinks, 0),
      totalUnresolved: asNumber(core.totalUnresolved, 0),
      totalReexports: asNumber(core.totalReexports, 0),
      totalAtoms: asNumber(core.totalAtoms, 0),
      totalTypes: asNumber(core.totalTypes, 0),
      totalEnums: asNumber(core.totalEnums, 0),
      totalConstants: asNumber(core.totalConstants, 0),
      totalSharedObjects: asNumber(core.totalSharedObjects, 0),
      cyclesDetected: Array.isArray(core.cyclesDetected) ? core.cyclesDetected.slice(0, 10) : [],
      cultureStats: core.cultureStats || null,
      enhanced: normalizeBoolean(core.enhanced),
      enhancedAt: core.enhancedAt || null
    }
  };
}

export function buildTrustGates({
  databaseHealth = null,
  metadataCoveragePct = 0,
  policyDriftCount = 0,
  policyCoverage = null,
  missingCanonicalSurfaceCount = 0,
  missingCanonicalApiCount = 0,
  watcherOrphanedIssues = 0,
  pipelineOrphanCount = 0,
  withoutLifecycle = 0,
  withoutContext = 0,
  slowToolCount = 0,
  sessionState = null
} = {}) {
  return [
    {
      key: 'database_core',
      state: databaseHealth?.healthy === true
        ? 'green'
        : asNumber(databaseHealth?.healthScore, 0) >= 70
          ? 'watching'
          : 'blocked',
      blocking: asNumber(databaseHealth?.healthScore, 0) < 70,
      reason: databaseHealth?.summary || 'Database health is unavailable.',
      recommendation: databaseHealth?.healthy === true
        ? 'Keep the canonical database surfaces aligned.'
        : asNumber(databaseHealth?.healthScore, 0) >= 70
          ? 'Monitor the remaining database warnings before trusting the control plane.'
        : (databaseHealth?.recommendations?.[0] || 'Reconcile the canonical database projections before trusting runtime reads.'),
      evidence: databaseHealth || null
    },
    {
      key: 'metadata_coverage',
      state: metadataCoveragePct >= 90 ? 'green' : metadataCoveragePct >= 80 ? 'watching' : 'blocked',
      blocking: metadataCoveragePct < 80,
      reason: `Metadata coverage is ${metadataCoveragePct}%`,
      recommendation: metadataCoveragePct >= 90
        ? 'Keep metadata extraction coverage above the trust threshold.'
        : metadataCoveragePct >= 80
          ? 'Close the remaining metadata coverage gap before treating downstream claims as authoritative.'
          : 'Lift metadata extraction coverage to at least 80% before trusting control-plane claims.',
      evidence: { metadataCoveragePct }
    },
    {
      key: 'issue_persistence',
      state: watcherOrphanedIssues === 0 && pipelineOrphanCount === 0 && withoutLifecycle === 0 && withoutContext === 0
        ? 'green'
        : (watcherOrphanedIssues > 0 || pipelineOrphanCount > 0 || withoutLifecycle > 0)
          ? 'blocked'
          : 'green',
      blocking: watcherOrphanedIssues > 0 || pipelineOrphanCount > 0 || withoutLifecycle > 0,
      reason: `${watcherOrphanedIssues} watcher orphan(s), ${pipelineOrphanCount} pipeline orphan(s), ${withoutLifecycle} without lifecycle, ${withoutContext} without context`,
      recommendation: watcherOrphanedIssues === 0 && pipelineOrphanCount === 0 && withoutLifecycle === 0 && withoutContext === 0
        ? 'Keep issue persistence self-healing.'
        : (watcherOrphanedIssues > 0 || pipelineOrphanCount > 0 || withoutLifecycle > 0)
          ? 'Reconcile watcher issue persistence and pipeline orphan counts before trusting issue-driven diagnostics.'
          : 'Fill issue context metadata before treating issue persistence as fully authoritative.',
      evidence: { watcherOrphanedIssues, pipelineOrphanCount, withoutLifecycle, withoutContext }
    },
    {
      key: 'policy_drift',
      state: policyCoverage?.coverageState === 'fresh'
        ? 'green'
        : policyCoverage?.coverageState === 'stale'
          ? 'watching'
          : policyDriftCount === 0
            ? 'green'
            : 'watching',
      blocking: false,
      reason: policyCoverage?.summaryText || `${policyDriftCount} active policy drift finding(s)`,
      recommendation: policyDriftCount === 0
        ? 'Keep the policy surfaces aligned with the canonical contract.'
        : policyCoverage?.nextAction || 'Reduce policy drift before trusting control-plane readiness claims.',
      evidence: { policyDriftCount, policyCoverage }
    },
    {
      key: 'canonical_inventory',
      state: missingCanonicalSurfaceCount === 0 && missingCanonicalApiCount === 0 ? 'green' : 'watching',
      blocking: false,
      reason: `${missingCanonicalSurfaceCount} missing canonical surface(s), ${missingCanonicalApiCount} missing canonical API(s)`,
      recommendation: missingCanonicalSurfaceCount === 0 && missingCanonicalApiCount === 0
        ? 'Keep canonical promotion candidates under review.'
        : 'Promote the missing canonical surfaces and collapse wrappers where possible.',
      evidence: { missingCanonicalSurfaceCount, missingCanonicalApiCount }
    },
    {
      key: 'tool_latency',
      state: 'green',
      blocking: false,
      reason: `${slowToolCount} tool(s) average above ${Math.round(SLOW_TOOL_THRESHOLD_MS / 1000)}s`,
      recommendation: slowToolCount === 0
        ? 'Keep tool latency under the observational threshold.'
        : 'Treat slow tools as operational noise unless they begin to block user workflows or freshness gates.',
      evidence: { slowToolCount, thresholdMs: SLOW_TOOL_THRESHOLD_MS }
    },
    {
      key: 'session_sync',
      state: sessionState?.clientSyncState === 'blocked'
        ? 'blocked'
        : (sessionState?.clientSyncState === 'stale' || sessionState?.clientSyncState === 'reconciling')
          ? 'watching'
          : 'green',
      blocking: sessionState?.clientSyncState === 'blocked',
      reason: sessionState?.clientSyncReason || 'Session sync is fresh.',
      recommendation: sessionState?.clientSyncRecommendation || 'Keep MCP session persistence in sync.',
      evidence: sessionState || null
    },
    {
      key: 'transport_alerts',
      state: sessionState?.transportAlertState === 'blocked'
        ? 'blocked'
        : sessionState?.transportAlertState === 'watchful'
          ? 'watching'
          : sessionState?.transportAlertState === 'fresh'
            ? 'green'
            : 'watching',
      blocking: sessionState?.transportAlertState === 'blocked',
      reason: sessionState?.transportAlertReason || 'Transport alert summary is unavailable.',
      recommendation: sessionState?.transportAlertRecommendation || 'Keep transport alert buckets active so session drift remains visible.',
      evidence: sessionState || null
    },
    {
      key: 'transport_provenance',
      state: sessionState?.transportProvenanceState === 'fresh'
        ? 'green'
        : sessionState?.transportProvenanceState === 'watchful'
          ? 'watching'
          : 'watching',
      blocking: false,
      reason: sessionState?.transportProvenanceReason || 'Transport provenance is not available.',
      recommendation: sessionState?.transportProvenanceRecommendation || 'Attach explicit transport provenance headers so direct HTTP and stdio bridge clients can be distinguished.',
      evidence: sessionState || null
    }
  ];
}

export function buildTrustSummary({
  trustState,
  confidenceScore,
  databaseHealth,
  metadataCoveragePct,
  policyDriftCount,
  watcherOrphanedIssues,
  pipelineOrphanCount,
  slowToolCount,
  toolRunCount,
  liveCounts
}) {
  return {
    oneLine: [
      `trust=${trustState}:${confidenceScore}/100`,
      `db=${databaseHealth?.healthScore || 0}/${databaseHealth?.grade || 'F'}`,
      `meta=${metadataCoveragePct}%`,
      `policy=${policyDriftCount}`,
      `watcherOrphans=${watcherOrphanedIssues}`,
      `pipelineOrphans=${pipelineOrphanCount}`,
      `slowTools=${slowToolCount}`,
      `toolRuns=${toolRunCount}`,
      `atoms=${liveCounts.activeAtoms || 0}`,
      `files=${liveCounts.activeFiles || 0}`
    ].join(' | '),
    nextAction: trustState === 'blocked'
      ? 'Reconcile the blocked trust gates before treating the control plane as authoritative.'
      : 'Keep monitoring the watching gates until the control plane stabilizes.'
  };
}

export function buildTrustConfidenceScore(gates = [], metadataCoveragePct = 0, policyDriftCount = 0, watcherOrphanedIssues = 0, pipelineOrphanCount = 0) {
  const blocked = gates.filter((gate) => gate.blocking).length;
  const watching = gates.filter((gate) => gate.state === 'watching').length;
  const policyPenalty = policyDriftCount > 0 ? Math.min(18, Math.round(policyDriftCount / 10)) : 0;
  const orphanPenalty = (watcherOrphanedIssues + pipelineOrphanCount) > 0
    ? Math.min(18, Math.round((watcherOrphanedIssues + pipelineOrphanCount) / 20))
    : 0;
  const metadataPenalty = metadataCoveragePct >= 90 ? 0 : Math.min(12, Math.round((90 - metadataCoveragePct) / 2));
  const rawScore = 100 - (blocked * 20) - (watching * 6) - policyPenalty - orphanPenalty - metadataPenalty;
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

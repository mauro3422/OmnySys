import { getRepository } from '#layer-c/storage/repository/index.js';
import { buildCanonicalPromotionReport } from './canonical-promotion-summary.js';
import { getDatabaseHealthSummary } from './database-health-summary.js';
import { loadCompilerExplainability } from './compiler-explainability-loader.js';
import { buildCompilerMetricsSnapshot } from './metrics/snapshot.js';
import { summarizeCompilerMetricsSnapshot } from './metrics/snapshot-summary.js';
import { getGraphCoverageSummary, getIssueSummary, getMcpSessionSummary } from './compiler-runtime-metrics/index.js';
import { getMetadataExtractionCoverage, summarizeMetadataExtractionCoverage } from './metadata-extraction-coverage/coverage.js';
import { buildCompilerSystemInventoryReport } from './system-inventory-summary.js';
import { buildToolRunTelemetrySummary } from './tool-run-telemetry/telemetry.js';
import { normalizeSnapshotPath } from './snapshot-path.js';
import { asNumber } from './core-utils.js';
import {
  buildTrustRemediationBatchPlan,
  summarizeTrustRemediationBatchPlan
} from './trust-remediation-batches.js';

const SLOW_TOOL_THRESHOLD_MS = 10000;
const DEFAULT_SAMPLE_LIMIT = 3;

function parseJsonValue(value) {
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

function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function summarizeSnapshotRow(row = null) {
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

function summarizeIssueRow(row = null) {
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

function summarizeSystemMetadataRows(rows = []) {
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

function loadSystemMetadata(db) {
  if (!db?.prepare) {
    return summarizeSystemMetadataRows([]);
  }

  try {
    const rows = db.prepare(`
      SELECT key, value, updated_at
      FROM system_metadata
      ORDER BY key
    `).all();
    return summarizeSystemMetadataRows(rows);
  } catch {
    return summarizeSystemMetadataRows([]);
  }
}

function loadRecentIssueSamples(db, limit = DEFAULT_SAMPLE_LIMIT) {
  if (!db?.prepare) {
    return [];
  }

  try {
    return db.prepare(`
      SELECT file_path, issue_type, severity, lifecycle_status, message, line_number, updated_at
      FROM semantic_issues
      WHERE (is_removed = 0 OR is_removed IS NULL)
      ORDER BY CASE LOWER(severity)
        WHEN 'critical' THEN 4
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        ELSE 0
      END DESC,
      updated_at DESC,
      id DESC
      LIMIT ?
    `).all(limit).map(summarizeIssueRow);
  } catch {
    return [];
  }
}

function loadSlowToolSamples(db, projectPath, windowDays = 7, limit = 5) {
  if (!db?.prepare || !projectPath) {
    return [];
  }

  try {
    const since = new Date(Date.now() - (windowDays * 24 * 60 * 60 * 1000)).toISOString();
    return db.prepare(`
      SELECT
        tool_name,
        COUNT(*) as run_count,
        AVG(duration_ms) as avg_duration_ms,
        MAX(duration_ms) as max_duration_ms,
        MAX(ended_at) as last_run_at
      FROM mcp_tool_runs
      WHERE project_path = ?
        AND ended_at >= ?
      GROUP BY tool_name
      HAVING COUNT(*) > 0
      ORDER BY avg_duration_ms DESC, max_duration_ms DESC, run_count DESC
      LIMIT ?
    `).all(projectPath, since, limit).map((row) => ({
      toolName: row.tool_name || null,
      runCount: asNumber(row.run_count, 0),
      avgDurationMs: asNumber(row.avg_duration_ms, 0),
      maxDurationMs: asNumber(row.max_duration_ms, 0),
      lastRunAt: row.last_run_at || null
    }));
  } catch {
    return [];
  }
}

function buildTrustGates({
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
    }
  ];
}

function buildTrustSummary({
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

function buildTrustConfidenceScore(gates = [], metadataCoveragePct = 0, policyDriftCount = 0, watcherOrphanedIssues = 0, pipelineOrphanCount = 0) {
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

export async function buildTrustInvestigationReport(projectPath, options = {}) {
  const resolvedProjectPath = projectPath || options.context?.projectPath || process.cwd();
  const repo = options.repo || getRepository(resolvedProjectPath);

  if (!repo?.db) {
    return {
      success: false,
      error: 'Repository unavailable',
      projectPath: resolvedProjectPath
    };
  }

  const db = repo.db;
  const scopePath = normalizeSnapshotPath(options.scopePath || null);
  const focusPath = normalizeSnapshotPath(options.focusPath || null);
  const persist = options.persist !== false;
  const includeSamples = options.includeSamples !== false;
  const compareDays = options.compareDays || 3;
  const historyLimit = options.historyLimit || 12;
  const toolRunTelemetryWindowDays = options.toolRunTelemetryWindowDays || 7;
  const sampleLimit = options.limit || DEFAULT_SAMPLE_LIMIT;
  const captureSource = options.captureSource || 'mcp.tool.get_trust_investigation_report';

  let compilerExplainability = null;
  try {
    compilerExplainability = await loadCompilerExplainability(
      resolvedProjectPath,
      options.watcherAlerts || [],
      options.context?.sharedState || {},
      options.context?.server?.fileWatcher?.getFileWatcherStats?.() || null,
      { scopePath, focusPath }
    );
  } catch (error) {
    compilerExplainability = { error: error.message };
  }

  const sessionState = getMcpSessionSummary(options.context?.server?.sessionManager || null, {
    runtimeSessionCount: options.context?.server?.sessions?.size,
    sessionDb: db
  });
  const systemInventoryDetail = compilerExplainability?.systemInventory || null;
  const systemInventory = buildCompilerSystemInventoryReport(systemInventoryDetail);
  const canonicalPromotion = buildCanonicalPromotionReport(compilerExplainability?.canonicalPromotion || null);
  const databaseHealth = compilerExplainability?.databaseHealth || getDatabaseHealthSummary(db);
  const metadataExtractionCoverage = compilerExplainability?.metadataExtractionCoverage || getMetadataExtractionCoverage(db);
  const policyCoverage = compilerExplainability?.policyCoverage || systemInventory?.policyCoverage || null;
  const metadataSummary = summarizeMetadataExtractionCoverage(metadataExtractionCoverage);
  const graphCoverage = getGraphCoverageSummary(db);
  const issueSummary = getIssueSummary(db);
  const toolTelemetry = buildToolRunTelemetrySummary(db, {
    projectPath: resolvedProjectPath,
    scopePath,
    focusPath,
    windowDays: toolRunTelemetryWindowDays
  });

  const metricsSnapshot = buildCompilerMetricsSnapshot({
    projectPath: resolvedProjectPath,
    scopePath,
    focusPath,
    captureSource,
    snapshotKind: 'trust',
    repo,
    compilerExplainability,
    systemInventory,
    canonicalPromotion,
    persist,
    compareDays,
    historyLimit,
    toolRunTelemetryWindowDays,
    mcpSessionSummary: sessionState
  });

  const latestTrustRow = persist ? db.prepare(`
    SELECT *
    FROM compiler_metrics_snapshots
    WHERE project_path = ?
      AND snapshot_kind = 'trust'
      AND IFNULL(scope_path, '') = IFNULL(?, '')
      AND IFNULL(focus_path, '') = IFNULL(?, '')
      AND captured_at = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(
    resolvedProjectPath,
    scopePath,
    focusPath,
    metricsSnapshot.current?.capturedAt || null
  ) : null;

  const systemMetadata = loadSystemMetadata(db);
  const liveCounts = {
    activeAtoms: asNumber(databaseHealth?.metrics?.activeAtoms, 0),
    activeFiles: asNumber(databaseHealth?.metrics?.activeFiles, 0),
    activeCallRelations: asNumber(databaseHealth?.metrics?.activeCallRelations, 0),
    activeSemanticConnections: asNumber(databaseHealth?.metrics?.activeSemanticConnections, 0)
  };
  const storedCounts = systemMetadata.coreMetadata || {};
  const metadataDrift = {
    activeAtomsDelta: liveCounts.activeAtoms - asNumber(storedCounts.totalAtoms, 0),
    activeFilesDelta: liveCounts.activeFiles - asNumber(storedCounts.totalFiles, 0)
  };

  const issueSamples = includeSamples ? loadRecentIssueSamples(db, sampleLimit) : [];
  const slowToolSamples = loadSlowToolSamples(db, resolvedProjectPath, toolRunTelemetryWindowDays, Math.max(sampleLimit, 5));
  const slowToolCount = slowToolSamples.filter((tool) => tool.avgDurationMs >= SLOW_TOOL_THRESHOLD_MS).length;
  const watcherIssuePersistence = issueSummary?.watcherIssuePersistence || {};
  const watcherOrphanedIssues = asNumber(watcherIssuePersistence.orphanedIssues, 0);
  const withoutLifecycle = asNumber(watcherIssuePersistence.withoutLifecycle, 0);
  const withoutContext = asNumber(watcherIssuePersistence.withoutContext, 0);
  const pipelineOrphanCount = asNumber(issueSummary?.pipelineOrphanCount || issueSummary?.orphanCount, 0);
  const lifecycleDistribution = watcherIssuePersistence.lifecycleDistribution || null;

  const policyDriftCount = asNumber(
    policyCoverage?.policyDriftCount
    || systemInventory?.policyDriftCount
    || compilerExplainability?.policySummary?.active
    || compilerExplainability?.policySummary?.total
    || 0,
    0
  );
  const missingCanonicalSurfaceCount = asNumber(systemInventory?.missingCanonicalSurfaceCount, 0);
  const missingCanonicalApiCount = asNumber(systemInventory?.missingCanonicalApiCount, 0);

  const gates = buildTrustGates({
    databaseHealth,
    metadataCoveragePct: metadataSummary.fieldCoveragePct || metadataSummary.coveragePct || 0,
    policyDriftCount,
    policyCoverage,
    missingCanonicalApiCount,
    missingCanonicalSurfaceCount,
    watcherOrphanedIssues,
    pipelineOrphanCount,
    withoutLifecycle,
    withoutContext,
    slowToolCount,
    sessionState
  });

  const trustState = gates.some((gate) => gate.blocking)
    ? 'blocked'
    : gates.some((gate) => gate.state === 'watching')
      ? 'watching'
      : 'trusted';
  const confidenceScore = buildTrustConfidenceScore(
    gates,
    metadataSummary.coveragePct || 0,
    policyDriftCount,
    watcherOrphanedIssues,
    pipelineOrphanCount
  );
  const summary = buildTrustSummary({
    trustState,
    confidenceScore,
    databaseHealth,
    metadataCoveragePct: metadataSummary.coveragePct || 0,
    policyDriftCount,
    watcherOrphanedIssues,
    pipelineOrphanCount,
    slowToolCount,
    toolRunCount: asNumber(toolTelemetry?.telemetry?.totalRuns || toolTelemetry?.totalRuns, 0),
    liveCounts
  });
  const remediationPlan = buildTrustRemediationBatchPlan({
    success: true,
    gates,
    trust: {
      state: trustState,
      confidenceScore,
      blockedCount: gates.filter((gate) => gate.blocking).length,
      watchingCount: gates.filter((gate) => gate.state === 'watching').length,
      greenCount: gates.filter((gate) => gate.state === 'green').length
    },
    inventory: {
      report: systemInventory,
      canonicalPromotion
    }
  });
  const priorityActions = gates
    .filter((gate) => gate.state !== 'green')
    .map((gate) => ({
      key: gate.key,
      state: gate.state,
      reason: gate.reason,
      recommendation: gate.recommendation,
      blocking: gate.blocking === true
    }))
    .slice(0, 4);
  const topIssueSample = issueSamples[0] || null;
  const topPromotionCandidate = systemInventory?.topPromotionCandidates?.[0] || null;

  return {
    success: true,
    aggregationType: 'trust_investigation_report',
    projectPath: resolvedProjectPath,
    scopePath,
    focusPath,
    snapshotKind: 'trust',
    capturedAt: metricsSnapshot.current?.capturedAt || new Date().toISOString(),
    snapshot: summarizeCompilerMetricsSnapshot(metricsSnapshot),
    snapshotHistory: metricsSnapshot.history || null,
    snapshotTrend: metricsSnapshot.trend || null,
    persistedSnapshotRow: summarizeSnapshotRow(latestTrustRow),
    database: {
      health: databaseHealth,
      graphCoverage,
      liveCounts,
      storedCounts,
      metadataDrift,
      systemMetadata
    },
    metadata: {
      coverage: metadataSummary,
      extraction: metadataExtractionCoverage,
      coreMetadata: storedCounts,
      schemaVersion: systemMetadata.schemaVersion,
      keys: systemMetadata.keys,
      cacheSqliteEnabled: systemMetadata.cacheSqliteEnabled,
      systemMapEnabled: systemMetadata.systemMapEnabled
    },
    inventory: {
      detail: systemInventoryDetail,
      report: systemInventory,
      canonicalPromotion
    },
    issues: {
      summary: issueSummary,
      watcherAudit: {
        activeIssueCount: asNumber(watcherIssuePersistence.activeIssueCount, 0),
        recentIssueCount: asNumber(watcherIssuePersistence.recentIssueCount, 0),
        withoutLifecycle,
        withoutContext
      },
      lifecycleDistribution,
      pipelineOrphans: {
        total: pipelineOrphanCount,
        summary: issueSummary?.pipelineOrphanSummary || null
      },
      persistence: {
        activeIssueCount: asNumber(watcherIssuePersistence.activeIssueCount, 0),
        watcherOrphanedIssues,
        pipelineOrphanCount,
        withoutLifecycle,
        withoutContext
      },
      topIssues: issueSamples
    },
    sessions: {
      summary: sessionState
    },
    tools: {
      telemetry: toolTelemetry,
      slowTools: slowToolSamples,
      slowToolCount,
      thresholdMs: SLOW_TOOL_THRESHOLD_MS
    },
    gates,
    trust: {
      state: trustState,
      confidenceScore,
      blockedCount: gates.filter((gate) => gate.blocking).length,
      watchingCount: gates.filter((gate) => gate.state === 'watching').length,
      greenCount: gates.filter((gate) => gate.state === 'green').length,
      dbTrusted: asNumber(databaseHealth?.healthScore, 0) >= 70,
      controlPlaneTrusted: trustState === 'trusted',
      nextAction: summary.nextAction
    },
    remediation: {
      batches: remediationPlan.batches,
      summary: summarizeTrustRemediationBatchPlan(remediationPlan)
    },
    samples: includeSamples ? {
      issue: topIssueSample,
      canonicalPromotion: topPromotionCandidate,
      slowTools: slowToolSamples,
      latestSnapshot: summarizeSnapshotRow(latestTrustRow)
    } : {
      issue: null,
      canonicalPromotion: topPromotionCandidate,
      slowTools: [],
      latestSnapshot: summarizeSnapshotRow(latestTrustRow)
    },
    summary,
    priorityActions
  };
}

export function summarizeTrustInvestigationReport(report = null) {
  if (!report || typeof report !== 'object') {
    return null;
  }

  return {
    trustState: report.trust?.state || 'missing',
    confidenceScore: asNumber(report.trust?.confidenceScore, 0),
    oneLine: report.summary?.oneLine || null,
    nextAction: report.summary?.nextAction || null,
    blockedCount: asNumber(report.trust?.blockedCount, 0),
    watchingCount: asNumber(report.trust?.watchingCount, 0),
    greenCount: asNumber(report.trust?.greenCount, 0),
    metadataCoveragePct: asNumber(report.metadata?.coverage?.coveragePct, 0),
    policyDriftCount: asNumber(report.inventory?.report?.policyDriftCount, 0),
    watcherOrphanedIssues: asNumber(report.issues?.persistence?.watcherOrphanedIssues, 0),
    activeIssueCount: asNumber(report.issues?.persistence?.activeIssueCount, 0),
    pipelineOrphanCount: asNumber(report.issues?.persistence?.pipelineOrphanCount, asNumber(report.issues?.pipelineOrphans?.total, 0)),
    orphanedIssues: asNumber(report.issues?.persistence?.watcherOrphanedIssues, 0),
    slowToolCount: asNumber(report.tools?.slowToolCount, 0),
    toolRunCount: asNumber(report.tools?.telemetry?.totalRuns || report.tools?.telemetry?.summary?.totalRuns, 0),
    activeAtoms: asNumber(report.database?.liveCounts?.activeAtoms, 0),
    activeFiles: asNumber(report.database?.liveCounts?.activeFiles, 0),
    remediationState: report.remediation?.summary?.state || 'missing',
    nextBatchKey: report.remediation?.summary?.nextBatchKey || null,
    nextBatchTitle: report.remediation?.summary?.nextBatchTitle || null,
    issueCount: asNumber(report.snapshot?.current?.issueCount, 0),
    capturedAt: report.capturedAt || null,
    snapshotKind: report.snapshotKind || 'trust'
  };
}

export default {
  buildTrustInvestigationReport,
  summarizeTrustInvestigationReport
};

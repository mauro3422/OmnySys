import { getRepository } from '#layer-c/storage/repository/index.js';
import { buildCanonicalPromotionReport } from './canonical-promotion-summary.js';
import { getDatabaseHealthSummary } from './database-health-summary.js';
import { loadCompilerExplainability } from './loader.js';
import { buildCompilerMetricsSnapshot } from './metrics/snapshot.js';
import { summarizeCompilerMetricsSnapshot } from './metrics/snapshot-summary/index.js';
import { getGraphCoverageSummary, getIssueSummary, getMcpSessionSummary } from './compiler-runtime-metrics/index.js';
import { getMetadataExtractionCoverage, summarizeMetadataExtractionCoverage } from './metadata-extraction-coverage/coverage.js';
import { buildCompilerSystemInventoryReport } from './system-inventory/summary.js';
import { buildToolRunTelemetrySummary } from './tool-run-telemetry/telemetry.js';
import { normalizeSnapshotPath } from './snapshot-path.js';
import { asNumber } from './core-utils.js';
import {
  buildTrustRemediationBatchPlan,
  summarizeTrustRemediationBatchPlan
} from './trust-remediation-batches.js';
import {
  buildTrustConfidenceScore,
  buildTrustGates,
  buildTrustSummary,
  DEFAULT_SAMPLE_LIMIT,
  normalizeBoolean,
  parseJsonValue,
  summarizeIssueRow,
  summarizeSnapshotRow,
  summarizeSystemMetadataRows,
  SLOW_TOOL_THRESHOLD_MS
} from './trust-investigation-report-helpers.js';

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

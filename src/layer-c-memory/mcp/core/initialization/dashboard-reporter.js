/**
 * @fileoverview dashboard-reporter.js
 *
 * Utility to print a consolidated system diagnostics dashboard to the console.
 * Aggregates Pipeline Integrity, Technical Debt, and Physics metrics.
 *
 * @module mcp/core/initialization/dashboard-reporter
 */

import { PipelineIntegrityDetector } from '#core/meta-detector/pipeline-integrity-detector.js';
import { IntegrityDashboard } from '#core/meta-detector/integrity-dashboard.js';
import { createLogger } from '#utils/logger.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { getValidDnaPredicate, getDuplicateEligiblePredicate } from '#layer-c/storage/repository/utils/duplicate-dna.js';
import { reconcileWatcherIssues } from '#core/file-watcher/watcher-issue-persistence.js';
import {
  getAtomCountSummary,
  getConceptualDuplicateSummary,
  getGraphCoverageSummary,
  getIssueSummary,
  getMcpSessionSummary,
  getPhase2FileCounts,
  getPipelineOrphanSummary,
  getDeadCodePlausibilitySummary,
  ensureLiveRowSync,
  loadCompilerDiagnosticsSnapshot,
  buildCompilerMetricsSnapshot,
  buildCompilerHealthDashboard,
  buildCompilerHealthPanel,
  buildCompilerToolInventorySnapshot,
  buildCompilerToolInventoryReport,
  buildCompilerSystemInventorySnapshot,
  buildCompilerSystemInventoryReport,
  buildStatusSummaryPayload
} from '#shared/compiler/index.js';
import { sessionManager } from '../manager.js';
import {
  buildBootstrapUpdateSurface,
  buildDashboardDetailLines,
  insertDashboardDetailLines,
  resolveDashboardHeader
} from './dashboard-reporter-helpers.js';

const logger = createLogger('OmnySys:DashboardReporter');

let lastReportType = null;
let lastReportSnapshot = '';

function isTransientDatabaseAvailabilityError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('database connection is not open')
    || message.includes('database is locked')
    || message.includes('database is busy');
}

export async function printDiagnosticsDashboard(projectPath, options = {}) {
  const { isFinal = false, force = false, startupTelemetry = null, snapshotKind = 'bootstrap' } = options;

  if (!isFinal && lastReportType === 'final' && !force) return;

  try {
    const repo = getRepository(projectPath);
    const db = repo?.db;
    if (!db) return;

    const detector = new PipelineIntegrityDetector(projectPath);
    const dashboard = new IntegrityDashboard();
    const integrityResults = await detector.verify();
    const report = await dashboard.generateReport(integrityResults);
    const extendedMetrics = await fetchExtendedMetrics(projectPath, db, repo, isFinal, startupTelemetry);

    const currentSnapshot = `${report.overallHealth}-${extendedMetrics.issueCount}-${extendedMetrics.conceptualGroups}-${extendedMetrics.conceptualRawGroups}`;
    if (!force && isFinal && lastReportType === 'final' && currentSnapshot === lastReportSnapshot) {
      return;
    }

    const consoleSummary = dashboard.generateConsoleSummary(report);
    const output = formatConsolidatedBox(consoleSummary, extendedMetrics, isFinal, snapshotKind);

    lastReportType = isFinal ? 'final' : 'preliminary';
    lastReportSnapshot = currentSnapshot;

    process.stdout.write(`\n${output}\n`);
  } catch (error) {
    if (isTransientDatabaseAvailabilityError(error)) {
      logger.debug(`Skipping consolidated dashboard during recovery: ${error.message}`);
      return;
    }

    logger.error('Failed to generate consolidated dashboard:', error.message);
  }
}

async function fetchExtendedMetrics(projectPath, db, repo, isFinal, startupTelemetry = null) {
  // Load atom inventory FIRST — before any reconciliation marks atoms as removed
  const metrics = {
    totalAtoms: 0,
    typeSummary: '',
    callableSummary: '',
    structuralGroups: 0,
    conceptualGroups: 0,
    conceptualCandidates: 0,
    conceptualImplementations: 0,
    conceptualRawGroups: 0,
    conceptualRawImplementations: 0,
    conceptualActionableRatio: 0,
    conceptualNoiseByClass: {},
    orphans: 0,
    issueCount: 0,
    issueSummary: '0 items',
    semanticLinks: 0,
    callLinks: 0,
    physicsCoverage: 0,
    hotspots: 0,
    phase2PendingFiles: 0,
    hasPhase2DebtSnapshot: false,
    zeroAtomFileCount: 0,
    liveCoverageRatio: 0,
    liveRowSyncSummary: null,
    compilerDiagnostics: null,
    metricsSnapshot: null,
    toolInventory: null,
    systemInventory: null,
    updateSurface: null,
    startupTelemetry,
    mcpSessionSummary: getMcpSessionSummary(sessionManager, {
      sessionDb: db
    })
  };

  try {
    // 1. Capture raw atom counts BEFORE reconciliation (prevents "0 atoms" bug)
    loadAtomInventory(metrics, db);
    loadGraphMetrics(metrics, db);
    loadPhysicsMetrics(metrics, db);

    // 2. Now run live row reconciliation
    const liveRowSync = ensureLiveRowSync(db, { autoSync: true, sampleLimit: 5 });
    metrics.liveRowSyncSummary = liveRowSync.summary;

    // 2b. Reconcile watcher issue persistence after row sync so inventory/trust
    // reads see the same lifecycle state as the atom/file graph.
    const watcherIssueReconciliation = await reconcileWatcherIssues(projectPath, {
      db,
      maxDelete: 1000
    });
    metrics.watcherIssueReconciliation = watcherIssueReconciliation;

    // 3. Load remaining metrics after reconciliation
    metrics.compilerDiagnostics = await loadCompilerDiagnosticsSnapshot({
      projectPath,
      db
    });
    const compilerDiagnostics = metrics.compilerDiagnostics;
    loadStructuralDuplicateMetrics(metrics, db);
    loadConceptualDuplicateMetrics(metrics, repo);
    loadIssueMetrics(metrics, db);
    loadPhase2Metrics(metrics, db);
    loadGraphMetrics(metrics, db);
    const fileUniverseSummary = metrics.compilerDiagnostics?.fileUniverseGranularity || {};
    metrics.zeroAtomFileCount = fileUniverseSummary.zeroAtomFileCount;
    metrics.liveCoverageRatio = fileUniverseSummary.liveCoverageRatio;
    const sessionSummary = metrics.mcpSessionSummary;
    metrics.metricsSnapshot = buildCompilerMetricsSnapshot({
      projectPath,
      repo,
      compilerExplainability: compilerDiagnostics,
      watcherAlerts: [],
      captureSource: isFinal ? 'dashboard.bootstrap.final' : 'dashboard.bootstrap.preliminary',
      snapshotKind: isFinal ? 'dashboard-final' : 'dashboard-preliminary',
      mcpSessionSummary: sessionSummary,
      startupTelemetry,
      persist: true
    });
    const toolInventorySnapshot = buildCompilerToolInventorySnapshot({ includeSchemas: false });
    metrics.toolInventory = buildCompilerToolInventoryReport(toolInventorySnapshot);
    const systemInventorySnapshot = buildCompilerSystemInventorySnapshot({
      projectPath,
      compilerExplainability: compilerDiagnostics,
      toolInventory: toolInventorySnapshot,
      historyStores: compilerDiagnostics?.historyStores || null
    });
    metrics.systemInventory = buildCompilerSystemInventoryReport(systemInventorySnapshot);
    metrics.healthSnapshot = buildCompilerHealthDashboard(metrics.metricsSnapshot, compilerDiagnostics, {
      watcherAlerts: [],
      recentErrors: null
    });
    metrics.healthPanel = buildCompilerHealthPanel(metrics.healthSnapshot);
    metrics.updateSurface = buildBootstrapUpdateSurface({
      projectPath,
      db,
      repo,
      liveRowSyncSummary: liveRowSync.summary,
      fileUniverseSummary: metrics.compilerDiagnostics?.fileUniverseGranularity || {},
      phase2PendingFiles: metrics.phase2PendingFiles,
      mcpSessionSummary: sessionSummary
    });
    metrics.statusPayload = buildStatusSummaryPayload({
      initialized: true,
      initializing: false,
      project: projectPath,
      telemetryMode: 'fast_phase2',
      timestamp: new Date().toISOString(),
      databaseHealth: metrics.compilerDiagnostics?.databaseHealth || null,
      repository: {
        status: {
          dbOpen: !!db?.open,
          ready: true,
          initialized: true,
          projectPath
        },
        integrity: liveRowSync?.summary || null
      },
      watcher: {
        isRunning: true,
        pendingChanges: 0,
        failedChanges: 0,
        lastChangeOrigin: 'bootstrap'
      },
      metadata: {
        totalFiles: metrics.compilerDiagnostics?.totalFiles || 0,
        totalFunctions: metrics.compilerDiagnostics?.totalFunctions || 0,
        lastAnalyzed: metrics.compilerDiagnostics?.lastAnalyzed || null,
        liveAtomCount: metrics.totalAtoms,
        liveFileCount: metrics.compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
        phase2PendingFiles: metrics.phase2PendingFiles,
        phase2CompletedFiles: metrics.compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
        societiesCount: metrics.compilerDiagnostics?.societiesCount || 0
      },
      cache: {
        atoms: metrics.totalAtoms,
        files: metrics.compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
        relations: metrics.callLinks,
        status: liveRowSync?.summary || 'bootstrap'
      },
      background: {
        phase2PendingFiles: metrics.phase2PendingFiles,
        phase2CompletedFiles: metrics.compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
        societiesCount: metrics.compilerDiagnostics?.societiesCount || 0,
        graphCoverage: {
          filesTotal: metrics.compilerDiagnostics?.fileUniverseGranularity?.liveFileCount || 0,
          dependenciesTotal: metrics.callLinks,
          coverageRatio: metrics.liveCoverageRatio || 0,
          callGraphLinks: metrics.callLinks
        },
        fileUniverseSummary: metrics.compilerDiagnostics?.fileUniverseGranularity || null,
        conceptualDuplicates: {
          actionableGroups: metrics.conceptualGroups,
          rawGroups: metrics.conceptualRawGroups,
          actionableRatio: metrics.conceptualActionableRatio
        },
        issueSummary: metrics.issueSummary,
        mcpSessionSummary: sessionSummary
      },
      mcpSessions: sessionSummary,
      compilerExplainability: compilerDiagnostics,
      metricsSnapshot: metrics.metricsSnapshot,
      healthSnapshot: metrics.healthSnapshot,
      healthPanel: metrics.healthPanel,
      systemInventory: metrics.systemInventory,
      canonicalPromotion: metrics.metricsSnapshot?.current?.canonicalPromotion || null,
      cachePolicy: metrics.metricsSnapshot?.current?.cachePolicy || null,
      toolInventory: toolInventorySnapshot,
      updateSurface: metrics.updateSurface,
      surfaceAudit: compilerDiagnostics?.surfaceAudit || null,
      signalConfidence: compilerDiagnostics?.signalConfidence || null
    }, []);
    loadPhysicsMetrics(metrics, db);
  } catch (error) {
    logger.debug('Extended metrics fetch partially failed:', error.message);
  }

  return metrics;
}

function loadAtomInventory(metrics, db) {
  const atomSummary = getAtomCountSummary(db);
  metrics.totalAtoms = atomSummary.totalAtoms;
  metrics.typeSummary = atomSummary.display.inventory;
  metrics.callableSummary = atomSummary.display.callable;
}

function loadStructuralDuplicateMetrics(metrics, db) {
  const validDna = getValidDnaPredicate();
  const eligible = getDuplicateEligiblePredicate();
  const dupStats = db.prepare(`
    SELECT COUNT(*) as group_count FROM (
      SELECT dna_json FROM atoms
      WHERE ${validDna}
        AND ${eligible}
      GROUP BY dna_json HAVING COUNT(*) > 1
    )
  `).get();
  metrics.structuralGroups = dupStats?.group_count || 0;
}

function loadConceptualDuplicateMetrics(metrics, repo) {
  const conceptualSummary = getConceptualDuplicateSummary(repo, { limit: 50 });
  metrics.conceptualGroups = conceptualSummary.actionableGroups;
  metrics.conceptualCandidates = conceptualSummary.rawImplementations;
  metrics.conceptualImplementations = conceptualSummary.actionableImplementations;
  metrics.conceptualRawGroups = conceptualSummary.rawGroups;
  metrics.conceptualRawImplementations = conceptualSummary.rawImplementations;
  metrics.conceptualActionableRatio = conceptualSummary.actionableRatio;
  metrics.conceptualNoiseByClass = conceptualSummary.noiseByClass;
  metrics.orphans = getPipelineOrphanSummary(repo.db)?.total || 0;
}

function loadIssueMetrics(metrics, db) {
  const issueSummary = getIssueSummary(db, { minDeadCodeLines: 5 });
  const deadCodeSummary = getDeadCodePlausibilitySummary(db, { minLines: 5 });

  metrics.issueCount = issueSummary.total;
  metrics.issueSummary = issueSummary.display;

  if (deadCodeSummary.warning) {
    metrics.issueSummary += ` | suspicious_dead=${deadCodeSummary.suspiciousDeadCandidates}`;
  }
}

function loadPhase2Metrics(metrics, db) {
  metrics.phase2PendingFiles = getPhase2FileCounts(db).pendingFiles;

  metrics.hasPhase2DebtSnapshot = Boolean(db.prepare(`
    SELECT 1
    FROM semantic_issues
    WHERE file_path = 'project-wide'
      AND issue_type = 'arch_technical_debt_high'
      AND (is_removed = 0 OR is_removed IS NULL)
      AND (lifecycle_status = 'active' OR lifecycle_status IS NULL)
    LIMIT 1
  `).get());
}

function loadGraphMetrics(metrics, db) {
  const graphCoverage = getGraphCoverageSummary(db);
  metrics.semanticLinks = graphCoverage.semanticLinks;
  metrics.callLinks = graphCoverage.callLinks;
}

function loadPhysicsMetrics(metrics, db) {
  const physics = db.prepare(`
    SELECT
      SUM(CASE WHEN fragility_score > 0 THEN 1 ELSE 0 END) as fragility_covered,
      SUM(CASE WHEN complexity > 10 THEN 1 ELSE 0 END) as complex_atoms
    FROM atoms
    WHERE (is_removed = 0 OR is_removed IS NULL)
  `).get();

  if (metrics.totalAtoms > 0) {
    metrics.physicsCoverage = Math.round(((physics?.fragility_covered || 0) / metrics.totalAtoms) * 100);
    metrics.hotspots = physics?.complex_atoms || 0;
  }
}

function formatConsolidatedBox(integrityConsoleSummary, extendedMetrics, isFinal, snapshotKind = 'bootstrap') {
  const lines = integrityConsoleSummary.split('\n');
  const isPreliminary = !isFinal;
  const isSettling = extendedMetrics.phase2PendingFiles > 0 || (!isFinal && !extendedMetrics.hasPhase2DebtSnapshot);
  const fileUniverseSettling = isSettling && extendedMetrics.liveCoverageRatio === 0;

  const headerIdx = lines.findIndex((line) => line.includes('OMNYSYS PIPELINE INTEGRITY REPORT'));
  if (headerIdx !== -1) {
    lines[headerIdx] = resolveDashboardHeader(isFinal, isSettling, snapshotKind);
  }

  const detailLines = buildDashboardDetailLines(extendedMetrics, {
    isFinal,
    isPreliminary,
    isSettling,
    fileUniverseSettling,
    snapshotKind
  });

  insertDashboardDetailLines(lines, detailLines);
  return lines.join('\n');
}

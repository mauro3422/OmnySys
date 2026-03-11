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
import {
  getAtomCountSummary,
  getConceptualDuplicateSummary,
  getFileUniverseSummary,
  getGraphCoverageSummary,
  getIssueSummary,
  getMcpSessionSummary,
  getPhase2FileCounts,
  getPipelineOrphanSummary,
  getDeadCodePlausibilitySummary
} from '#shared/compiler/index.js';
import { sessionManager } from '../session-manager.js';

const logger = createLogger('OmnySys:DashboardReporter');

let lastReportType = null;
let lastReportSnapshot = '';

export async function printDiagnosticsDashboard(projectPath, options = {}) {
  const { isFinal = false, force = false } = options;

  if (!isFinal && lastReportType === 'final' && !force) return;

  try {
    const repo = getRepository(projectPath);
    const db = repo?.db;
    if (!db) return;

    const detector = new PipelineIntegrityDetector(projectPath);
    const dashboard = new IntegrityDashboard();
    const integrityResults = await detector.verify();
    const report = await dashboard.generateReport(integrityResults);
    const extendedMetrics = await fetchExtendedMetrics(projectPath, db, repo);

    const currentSnapshot = `${report.overallHealth}-${extendedMetrics.issueCount}-${extendedMetrics.conceptualGroups}-${extendedMetrics.conceptualRawGroups}`;
    if (!force && isFinal && lastReportType === 'final' && currentSnapshot === lastReportSnapshot) {
      return;
    }

    const consoleSummary = dashboard.generateConsoleSummary(report);
    const output = formatConsolidatedBox(consoleSummary, extendedMetrics, isFinal);

    lastReportType = isFinal ? 'final' : 'preliminary';
    lastReportSnapshot = currentSnapshot;

    process.stdout.write(`\n${output}\n`);
  } catch (error) {
    logger.error('Failed to generate consolidated dashboard:', error.message);
  }
}

async function fetchExtendedMetrics(projectPath, db, repo) {
  const metrics = {
    totalAtoms: 0,
    typeSummary: '',
    callableSummary: '',
    structuralGroups: 0,
    conceptualGroups: 0,
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
    mcpSessionSummary: getMcpSessionSummary(sessionManager)
  };

  try {
    loadAtomInventory(metrics, db);
    loadStructuralDuplicateMetrics(metrics, db);
    loadConceptualDuplicateMetrics(metrics, repo);
    loadIssueMetrics(metrics, db);
    loadPhase2Metrics(metrics, db);
    loadGraphMetrics(metrics, db);
    loadFileUniverseMetrics(metrics, db);
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

function loadFileUniverseMetrics(metrics, db) {
  const fileUniverseSummary = getFileUniverseSummary(db);
  metrics.zeroAtomFileCount = fileUniverseSummary.zeroAtomFileCount;
  metrics.liveCoverageRatio = fileUniverseSummary.liveCoverageRatio;
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

function formatConsolidatedBox(integrityConsoleSummary, extendedMetrics, isFinal) {
  const lines = integrityConsoleSummary.split('\n');
  const headerPattern = 'OMNYSYS PIPELINE INTEGRITY REPORT';
  const isPreliminary = !isFinal;
  const isSettling = extendedMetrics.phase2PendingFiles > 0 || (!isFinal && !extendedMetrics.hasPhase2DebtSnapshot);

  const headerIdx = lines.findIndex((line) => line.includes(headerPattern));
  if (headerIdx !== -1) {
    lines[headerIdx] = isFinal
      ? 'FINAL SYSTEM SUMMARY'
      : isSettling
        ? 'PRELIMINARY SYSTEM SUMMARY'
        : 'SYSTEM SUMMARY';
  }

  const detailLines = [
    ...(isPreliminary && isSettling
      ? ['  Preliminary snapshot: Phase 2 telemetry is still settling; final debt counts may change.', '']
      : []),
    `  Project: ${extendedMetrics.totalAtoms} atoms (${extendedMetrics.typeSummary})`,
    `  Callable Atoms: ${extendedMetrics.callableSummary}`,
    `  File Universe: ${Math.round(extendedMetrics.liveCoverageRatio * 100)}% live coverage (${extendedMetrics.zeroAtomFileCount} zero-atom files expected)`,
    `  MCP Sessions: ${extendedMetrics.mcpSessionSummary.summary}`,
    `  Graph Coverage: call graph=${extendedMetrics.callLinks} links, semantic layer=${extendedMetrics.semanticLinks} high-level links`,
    `  Duplicates: ${extendedMetrics.structuralGroups} structural groups, ${extendedMetrics.conceptualGroups} conceptual actionable groups (${extendedMetrics.conceptualRawGroups} raw groups)` +
      (extendedMetrics.conceptualImplementations > 0
        ? ` | implementations=${extendedMetrics.conceptualImplementations} actionable (${extendedMetrics.conceptualRawImplementations} raw)`
        : ''),
    extendedMetrics.conceptualRawGroups > 0
      ? `  Conceptual Signal: actionable/raw ratio=${Math.round(extendedMetrics.conceptualActionableRatio * 100)}%`
      : null,
    ((extendedMetrics.conceptualNoiseByClass.expected_repeat || 0) + (extendedMetrics.conceptualNoiseByClass.low_signal || 0)) > 0
      ? `  Conceptual noise filtered: expected_repeat=${extendedMetrics.conceptualNoiseByClass.expected_repeat || 0}, low_signal=${extendedMetrics.conceptualNoiseByClass.low_signal || 0}`
      : null,
    `  Technical Debt: ${extendedMetrics.issueSummary}${extendedMetrics.orphans > 0 ? ` (+${extendedMetrics.orphans} orphans)` : ''}`,
    `  Physics Coverage: ${extendedMetrics.physicsCoverage}% signals (${extendedMetrics.hotspots} hotspots)`,
    ''
  ].filter(Boolean);

  let insertIdx = lines.findIndex((line) => line.includes('CRITICAL ISSUES'));
  if (insertIdx === -1) insertIdx = lines.findIndex((line) => line.includes('TOP RECOMMENDATIONS'));
  if (insertIdx === -1) insertIdx = lines.length - 2;

  lines.splice(insertIdx, 0, ...detailLines);
  return lines.join('\n');
}

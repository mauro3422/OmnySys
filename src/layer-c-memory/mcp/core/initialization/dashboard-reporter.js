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
    structuralGroups: 0,
    conceptualGroups: 0,
    conceptualRawGroups: 0,
    conceptualNoiseByClass: {},
    orphans: 0,
    issueCount: 0,
    issueSummary: '0 items',
    relations: 0,
    physicsCoverage: 0,
    hotspots: 0,
    phase2PendingFiles: 0,
    hasPhase2DebtSnapshot: false
  };

  try {
    const atomCounts = db.prepare(`
      SELECT atom_type, COUNT(*) as count FROM atoms
      WHERE (is_removed = 0 OR is_removed IS NULL)
      GROUP BY atom_type
    `).all();

    metrics.totalAtoms = atomCounts.reduce((sum, atom) => sum + atom.count, 0);
    metrics.typeSummary = atomCounts
      .filter((atom) => ['function', 'class', 'module', 'variable'].includes(atom.atom_type))
      .map((atom) => `${atom.count} ${atom.atom_type}${atom.count > 1 ? 's' : ''}`)
      .join(', ');

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

    try {
      if (repo.findConceptualDuplicates) {
        const conceptualGroups = repo.findConceptualDuplicates({ limit: 5000 });
        const conceptualSummary = conceptualGroups?.summary || null;
        metrics.conceptualGroups = conceptualSummary?.actionable?.groupCount || conceptualGroups.length;
        metrics.conceptualRawGroups = conceptualSummary?.raw?.groupCount || conceptualGroups.length;
        metrics.conceptualNoiseByClass = conceptualSummary?.noiseByClass || {};
      }

      const { getPipelineOrphanSummary } = await import('#shared/compiler/index.js');
      metrics.orphans = getPipelineOrphanSummary(db)?.total || 0;
    } catch (error) {
      logger.debug('Conceptual duplicate metrics unavailable:', error.message);
    }

    const issues = db.prepare(`
      SELECT severity, COUNT(*) as count FROM semantic_issues
      WHERE (is_removed = 0 OR is_removed IS NULL)
        AND (lifecycle_status = 'active' OR lifecycle_status IS NULL)
      GROUP BY severity
    `).all();
    metrics.issueCount = issues.reduce((sum, issue) => sum + issue.count, 0);
    metrics.issueSummary = issues.map((issue) => `${issue.count} ${issue.severity}`).join(', ') || '0 items';

    metrics.phase2PendingFiles = db.prepare(`
      SELECT COUNT(DISTINCT file_path) as count
      FROM atoms
      WHERE is_phase2_complete = 0
    `).get()?.count || 0;

    metrics.hasPhase2DebtSnapshot = Boolean(db.prepare(`
      SELECT 1
      FROM semantic_issues
      WHERE file_path = 'project-wide'
        AND issue_type = 'arch_technical_debt_high'
        AND (is_removed = 0 OR is_removed IS NULL)
        AND (lifecycle_status = 'active' OR lifecycle_status IS NULL)
      LIMIT 1
    `).get());

    metrics.relations = db.prepare(`
      SELECT COUNT(*) as count FROM atom_relations
      WHERE (is_removed = 0 OR is_removed IS NULL)
    `).get()?.count || 0;

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
  } catch (error) {
    logger.debug('Extended metrics fetch partially failed:', error.message);
  }

  return metrics;
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
    `  Semantic Density: ${extendedMetrics.relations} cross-links (Impact Map active)`,
    `  Duplicates: ${extendedMetrics.structuralGroups} structural, ${extendedMetrics.conceptualGroups} conceptual actionable (${extendedMetrics.conceptualRawGroups} raw)`,
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

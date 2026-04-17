/**
 * @fileoverview dashboard-reporter.js
 *
 * Utility to print a consolidated system diagnostics dashboard to the console.
 * Aggregates Pipeline Integrity, Technical Debt, and Physics metrics.
 *
 * @module mcp/core/initialization/dashboard-reporter
 */

import { PipelineIntegrityDetector } from '../../../../core/meta-detector/pipeline-integrity-detector/detector.js';
import { IntegrityDashboard } from '../../../../core/meta-detector/integrity-dashboard.js';
import { createLogger } from '../../../../utils/logger.js';
import { getRepository } from '../../../storage/repository/index.js';
import {
  buildBootstrapDiagnosticsFallbackSummary,
  buildDashboardDetailLines,
  insertDashboardDetailLines,
  resolveDashboardHeader
} from './helpers.js';
import { fetchExtendedMetrics } from './dashboard-metrics.js';

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
    const extendedMetrics = await fetchExtendedMetrics(projectPath, db, repo, isFinal, startupTelemetry);
    let report = null;
    try {
      const integrityResults = await detector.verify();
      report = await dashboard.generateReport(integrityResults);
    } catch (error) {
      logger.warn(`Falling back to startup summary: ${error.message}`);
    }

    const currentSnapshot = `${report?.overallHealth || 'fallback'}-${extendedMetrics.issueCount}-${extendedMetrics.conceptualGroups}-${extendedMetrics.conceptualRawGroups}`;
    if (!force && isFinal && lastReportType === 'final' && currentSnapshot === lastReportSnapshot) {
      return;
    }

    const consoleSummary = report
      ? dashboard.generateConsoleSummary(report)
      : buildBootstrapDiagnosticsFallbackSummary(extendedMetrics, { isFinal, snapshotKind });
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

export default {
  printDiagnosticsDashboard
};

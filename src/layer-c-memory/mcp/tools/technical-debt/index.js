/**
 * @fileoverview technical-debt-report.js
 *
 * MCP tool for automatic technical debt reporting at connect time.
 * It uses the canonical snapshot as a cache key and persists the last
 * report so repeated calls do not re-scan the project unless the state changed.
 *
 * @module mcp/tools/technical-debt-report
 */

import { AggregateMetricsTool } from '../aggregate-metrics.js';
import { getRepository } from '../../../storage/repository/index.js';
import { buildCompilerMetricsSnapshot } from '../../../../shared/compiler/index.js';
import {
  TECHNICAL_DEBT_SNAPSHOT_KIND,
  buildTechnicalDebtFingerprint,
  loadCachedTechnicalDebtReport,
  persistTechnicalDebtReport
} from '../technical-debt-report-cache.js';
import {
  buildTechnicalDebtReportResult,
  loadTechnicalDebtReportDetails
} from './report-core.js';

export async function getTechnicalDebtReport(args, context) {
  try {
    const projectPath = context?.projectPath || null;
    const folderizationOptions = {
      scopePath: args?.scopePath || null,
      focusPath: args?.focusPath || null
    };
    const repo = projectPath ? getRepository(projectPath) : null;
    const currentSnapshot = buildCompilerMetricsSnapshot({
      projectPath,
      scopePath: folderizationOptions.scopePath,
      focusPath: folderizationOptions.focusPath,
      captureSource: 'mcp.tool.get_technical_debt_report',
      snapshotKind: TECHNICAL_DEBT_SNAPSHOT_KIND,
      repo,
      persist: false,
      compareDays: 3,
      historyLimit: 3,
      toolRunTelemetryWindowDays: 7
    });

    const fingerprint = currentSnapshot.current?.snapshotFingerprint
      || buildTechnicalDebtFingerprint({
        projectPath,
        scopePath: folderizationOptions.scopePath,
        focusPath: folderizationOptions.focusPath,
        currentSnapshot
      });
    const cachedReport = loadCachedTechnicalDebtReport(repo?.db, {
      projectPath,
      scopePath: folderizationOptions.scopePath,
      focusPath: folderizationOptions.focusPath
    });

    if (cachedReport?.fingerprint === fingerprint && cachedReport.report) {
      return {
        success: true,
        aggregationType: 'technical_debt_report',
        cache: {
          hit: true,
          fingerprint,
          capturedAt: cachedReport.capturedAt || null
        },
        ...cachedReport.report
      };
    }

    const aggregateTool = new AggregateMetricsTool();
    const details = await loadTechnicalDebtReportDetails({
      aggregateTool,
      context,
      repo,
      folderizationOptions,
      currentSnapshot
    });

    const report = buildTechnicalDebtReportResult({
      ...details,
      currentSnapshot,
      fingerprint
    });

    persistTechnicalDebtReport(repo?.db, {
      projectPath,
      scopePath: folderizationOptions.scopePath,
      focusPath: folderizationOptions.focusPath,
      currentSnapshot,
      report,
      fingerprint
    });

    return report;
  } catch (error) {
    console.error('[TechnicalDebtReport] Error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export const technical_debt_report = async (args, context) => {
  return getTechnicalDebtReport(args, context);
};

export default { technical_debt_report };

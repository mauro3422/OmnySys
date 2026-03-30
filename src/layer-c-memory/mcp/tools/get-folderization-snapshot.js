/**
 * Tool: mcp_omnysystem_get_folderization_snapshot
 *
 * Returns a lightweight, DB-backed snapshot of folderization guidance,
 * naming debt and DB sync state without requiring the full compiler health
 * snapshot pipeline.
 */

import { createLogger } from '../../../utils/logger.js';
import { buildFolderizationSnapshotContext } from './folderization-snapshot-service.js';

const logger = createLogger('OmnySys:folderization-snapshot');

export async function get_folderization_snapshot(args, context) {
  logger.info('[Tool] get_folderization_snapshot()');

  try {
    const result = await buildFolderizationSnapshotContext(args, context, {
      captureSource: 'mcp.tool.get_folderization_snapshot',
      snapshotKind: args?.snapshotKind || 'folderization'
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Project repository unavailable'
      };
    }

    return {
      success: true,
      aggregationType: 'folderization_snapshot',
      snapshot: result.snapshot,
      history: result.history,
      trend: result.trend,
      folderization: result.folderizationReport,
      recommendedAction: result.snapshot.summary.recommendedAction || null,
      nextBestFolder: result.snapshot.summary.nextBestFolder || null,
      nextBestStem: result.snapshot.summary.nextBestStem || null,
      whyThisFirst: result.snapshot.summary.whyThisFirst || null,
      databaseHealth: result.databaseHealth ? {
        healthy: result.databaseHealth.healthy === true,
        healthScore: Number(result.databaseHealth.healthScore || 0),
        healthGrade: result.databaseHealth.grade || 'F',
        summary: result.databaseHealth.summary || null,
        metrics: result.databaseHealth.metrics || null,
        criticalFindings: result.databaseHealth.criticalFindings || [],
        warnings: result.databaseHealth.warnings || [],
        recommendations: result.databaseHealth.recommendations || []
      } : null,
      summary: result.snapshot.summary,
      oneLine: result.snapshot.summary.summaryText,
      guidance: result.folderizationReport?.creationGuidance || null
    };
  } catch (error) {
    logger.error(`[Tool] get_folderization_snapshot failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_folderization_snapshot };

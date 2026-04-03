/**
 * Tool: mcp_omnysystem_get_metrics_snapshot
 *
 * Captures and persists a canonical compiler/system metrics snapshot with
 * historical comparison and velocity indicators.
 */

import { createLogger } from '../../../utils/logger.js';
import { buildCompilerSnapshotContext } from './compiler-snapshot-service.js';

const logger = createLogger('OmnySys:metrics-snapshot');

export async function get_metrics_snapshot(args, context) {
  logger.info('[Tool] get_metrics_snapshot()');

  try {
    const result = await buildCompilerSnapshotContext(args, context, {
      captureSource: 'mcp.tool.get_metrics_snapshot',
      snapshotKind: args?.snapshotKind || 'manual'
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Project repository unavailable'
      };
    }

    return {
      success: true,
      aggregationType: 'metrics_snapshot',
      snapshot: result.compactSnapshot,
      dashboard: result.healthDashboard,
      summary: result.snapshot.summary,
      history: result.snapshot.history,
      trend: result.snapshot.trend,
      systemInventory: result.systemInventory || null
    };
  } catch (error) {
    logger.error(`[Tool] get_metrics_snapshot failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_metrics_snapshot };

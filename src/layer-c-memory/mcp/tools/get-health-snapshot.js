/**
 * Tool: mcp_omnysystem_get_health_snapshot
 *
 * Returns a compact operational health dashboard built on the canonical
 * compiler metrics snapshot, with velocity, readiness, repair telemetry and
 * top regression/improvement signals.
 */

import { createLogger } from '../../../utils/logger.js';
import { buildCompilerSnapshotContext } from './compiler-snapshot-service.js';

const logger = createLogger('OmnySys:health-snapshot');

export async function get_health_snapshot(args, context) {
  logger.info('[Tool] get_health_snapshot()');

  try {
    const result = await buildCompilerSnapshotContext(args, context, {
      captureSource: 'mcp.tool.get_health_snapshot',
      snapshotKind: args?.snapshotKind || 'dashboard'
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Project repository unavailable'
      };
    }

    return {
      success: true,
      aggregationType: 'health_snapshot',
      dashboard: result.healthDashboard,
      panel: result.healthPanel,
      snapshot: result.compactSnapshot,
      summary: result.snapshot.summary,
      history: result.snapshot.history,
      trend: result.snapshot.trend,
      oneLine: result.healthPanel?.oneLine || null,
      systemInventory: result.systemInventory || null,
      canonicalPromotionDetail: result.canonicalPromotionDetail || null,
      canonicalPromotion: result.canonicalPromotion || null,
      compilerExplainability: result.compilerExplainability ? {
        policySummary: result.compilerExplainability.policySummary || null,
        standardization: result.compilerExplainability.standardization || null,
        databaseHealth: result.compilerExplainability.databaseHealth || null,
        folderization: result.compilerExplainability.folderization || null,
        canonicalPromotion: result.compilerExplainability.canonicalPromotion || null,
        dataGatewayContract: result.compilerExplainability.dataGatewayContract || null,
        compilerContractLayer: result.compilerExplainability.compilerContractLayer || null,
        surfaceAudit: result.compilerExplainability.surfaceAudit || null,
        driftAssessment: result.compilerExplainability.driftAssessment || null
      } : null
    };
  } catch (error) {
    logger.error(`[Tool] get_health_snapshot failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_health_snapshot };

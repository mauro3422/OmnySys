/**
 * Tool: mcp_omnysystem_get_canonical_promotion_report
 *
 * Combines the canonical system inventory with folderization evidence to
 * determine whether an emergent surface is ready to be promoted into a
 * canonical API.
 */

import { createLogger } from '../../../utils/logger.js';
import {
  buildCanonicalPromotionReport,
  buildCanonicalPromotionSnapshot
} from '../../../shared/compiler/index.js';
import { buildCompilerSnapshotContext } from './compiler-snapshot-service.js';
import { buildFolderizationSnapshotContext } from './folderization-snapshot-service.js';

const logger = createLogger('OmnySys:canonical-promotion');

export async function get_canonical_promotion_report(args, context) {
  logger.info('[Tool] get_canonical_promotion_report()');

  try {
    const [inventoryResult, folderizationResult] = await Promise.all([
      buildCompilerSnapshotContext(args, context, {
        captureSource: 'mcp.tool.get_canonical_promotion_report',
        snapshotKind: args?.snapshotKind || 'promotion'
      }),
      buildFolderizationSnapshotContext(args, context, {
        captureSource: 'mcp.tool.get_canonical_promotion_report',
        snapshotKind: args?.snapshotKind || 'promotion'
      })
    ]);

    if (!inventoryResult.success) {
      return {
        success: false,
        error: inventoryResult.error || 'Project repository unavailable'
      };
    }

    const promotionDetail = buildCanonicalPromotionSnapshot({
      projectPath: inventoryResult.projectPath || context?.projectPath || null,
      scopePath: args?.scopePath || null,
      focusPath: args?.focusPath || null,
      systemInventory: inventoryResult.systemInventory,
      folderizationReport: folderizationResult?.folderizationReport || null,
      limit: args?.limit || 5
    });
    const promotion = buildCanonicalPromotionReport(promotionDetail);

    return {
      success: true,
      aggregationType: 'canonical_promotion',
      promotion,
      promotionDetail,
      inventory: inventoryResult.systemInventoryDetail || null,
      folderization: folderizationResult?.folderizationReport || null,
      snapshot: inventoryResult.compactSnapshot,
      dashboard: inventoryResult.healthDashboard,
      summary: promotion?.summaryText || promotion?.nextAction || null,
      topPromotionTargets: promotion?.topPromotionTargets || [],
      systemInventory: inventoryResult.systemInventory || null,
      canonicalPromotion: inventoryResult.canonicalPromotion || null,
      compilerExplainability: inventoryResult.compilerExplainability ? {
        systemInventory: inventoryResult.compilerExplainability.systemInventory || null,
        canonicalPromotion: inventoryResult.compilerExplainability.canonicalPromotion || null,
        standardization: inventoryResult.compilerExplainability.standardization || null,
        compilerContractLayer: inventoryResult.compilerExplainability.compilerContractLayer || null,
        surfaceAudit: inventoryResult.compilerExplainability.surfaceAudit || null,
        driftAssessment: inventoryResult.compilerExplainability.driftAssessment || null
      } : null
    };
  } catch (error) {
    logger.error(`[Tool] get_canonical_promotion_report failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_canonical_promotion_report };

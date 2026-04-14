import { buildCanonicalPromotionReport, buildCanonicalPromotionSnapshot } from '../../../shared/compiler/index.js';
import { buildCanonicalPromotionResponse } from './get-canonical-promotion/helpers.js';
import { buildCompilerSnapshotContext } from './compiler-snapshot-service/index.js';
import { buildFolderizationSnapshotContext } from './folderization-snapshot-service.js';

export async function runCanonicalPromotionReport(args, context) {
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

  return buildCanonicalPromotionResponse({
    promotion,
    promotionDetail,
    inventoryResult,
    folderizationResult
  });
}

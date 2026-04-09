/**
 * Tool: mcp_omnysystem_get_system_inventory_report
 *
 * Returns the canonical system inventory for emergent APIs, canonical
 * surfaces, bridges and wrappers, along with the compact report used by
 * status/health consumers.
 */

import { createLogger } from '../../../utils/logger.js';
import { buildCompilerSnapshotContext } from './compiler-snapshot-service.js';

const logger = createLogger('OmnySys:system-inventory');

function buildSystemInventoryResponse(result) {
  return {
    success: true,
    aggregationType: 'system_inventory',
    inventory: result.systemInventoryDetail || null,
    report: result.systemInventory || null,
    propagation: result.canonicalPromotionDetail?.folderization?.propagation
      || result.compactSnapshot?.current?.folderizationPropagation
      || result.compactSnapshot?.folderizationPropagation
      || null,
    snapshot: result.compactSnapshot,
    dashboard: result.healthDashboard,
    observability: result.observability || null,
    controlPlane: result.controlPlane || null,
    summary: result.systemInventory?.summaryText || result.systemInventory?.summary?.summaryText || null,
    topSystems: result.systemInventory?.topSystems || [],
    promotionCandidates: result.systemInventory?.topPromotionCandidates || [],
    canonicalPromotionDetail: result.canonicalPromotionDetail || null,
    canonicalPromotion: result.canonicalPromotion || null,
    tooling: result.systemInventory?.tooling || null,
    compilerExplainability: result.compilerExplainability ? {
      standardization: result.compilerExplainability.standardization || null,
      compilerContractLayer: result.compilerExplainability.compilerContractLayer || null,
      canonicalPromotion: result.compilerExplainability.canonicalPromotion || null,
      controlPlane: result.compilerExplainability.controlPlane || null,
      surfaceAudit: result.compilerExplainability.surfaceAudit || null,
      driftAssessment: result.compilerExplainability.driftAssessment || null
    } : null
  };
}

export async function get_system_inventory_report(args, context) {
  logger.info('[Tool] get_system_inventory_report()');

  try {
    const result = await buildCompilerSnapshotContext(args, context, {
      captureSource: 'mcp.tool.get_system_inventory_report',
      snapshotKind: args?.snapshotKind || 'inventory'
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Project repository unavailable'
      };
    }

    return buildSystemInventoryResponse(result);
  } catch (error) {
    logger.error(`[Tool] get_system_inventory_report failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_system_inventory_report };

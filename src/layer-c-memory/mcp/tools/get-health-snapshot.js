/**
 * Tool: mcp_omnysystem_get_health_snapshot
 *
 * Returns a compact operational health dashboard built on the canonical
 * compiler metrics snapshot, with velocity, readiness, repair telemetry and
 * top regression/improvement signals.
 */

import { createLogger } from '../../../utils/logger.js';
import {
  buildPropagationPlan,
  summarizePropagationPlan
} from '../../../shared/compiler/index.js';
import { buildCompilerSnapshotContext } from './compiler-snapshot-service/index.js';

const logger = createLogger('OmnySys:health-snapshot');

function buildHealthSnapshotPropagation(result) {
  const propagation = result.controlPlane?.propagation || result.controlPlaneSummary?.propagation || null;
  const missingSystems = Array.isArray(propagation?.missingSystemNames)
    ? propagation.missingSystemNames
    : [];
  const state = propagation?.state || 'missing';
  const decision = state === 'fresh'
    ? 'approve'
    : state === 'stale' || state === 'watching' || state === 'partial'
      ? 'review'
      : 'reject';

  return summarizePropagationPlan(buildPropagationPlan({
    changeType: 'folderization',
    decision,
    impactedFileCount: Number(propagation?.missingSystemCount || 0),
    rewriteCount: Number(propagation?.missingSystemCount || 0),
    validationTargetCount: Number(propagation?.expectedSystemCount || 0),
    hasCrossFamilyPropagation: missingSystems.length > 0,
    topImpactedFiles: missingSystems.slice(0, 5).map((name) => ({
      filePath: name,
      dependencyCount: 1
    })),
    topCandidates: missingSystems.slice(0, 5).map((name) => ({
      familyRoot: name,
      decision: 'missing'
    })),
    candidateCount: Number(propagation?.expectedSystemCount || 0),
    guidance: propagation?.recommendation || null,
    recommendationStrategy: 'health_snapshot',
    drift: propagation ? {
      state,
      reason: propagation?.recommendation || propagation?.state || 'Propagation state unavailable.'
    } : null,
    scopePath: result.snapshot?.scopePath || null,
    focusPath: result.snapshot?.focusPath || null
  }));
}

function buildHealthSnapshotResponse(result) {
  return {
    success: true,
    aggregationType: 'health_snapshot',
    dashboard: result.healthDashboard,
    panel: result.healthPanel,
    snapshot: result.compactSnapshot,
    observability: result.observability || null,
    controlPlane: result.controlPlane || null,
    summary: result.snapshot.summary,
    history: result.snapshot.history,
    trend: result.snapshot.trend,
    oneLine: result.healthPanel?.oneLine || null,
    propagation: buildHealthSnapshotPropagation(result),
    systemInventory: result.systemInventory || null,
    canonicalPromotionDetail: result.canonicalPromotionDetail || null,
    canonicalPromotion: result.canonicalPromotion || null,
    startupTelemetry: result.snapshot?.current?.startupTelemetry || null,
    compilerExplainability: result.compilerExplainability ? {
      policySummary: result.compilerExplainability.policySummary || null,
      standardization: result.compilerExplainability.standardization || null,
      databaseHealth: result.compilerExplainability.databaseHealth || null,
      folderization: result.compilerExplainability.folderization || null,
      canonicalPromotion: result.compilerExplainability.canonicalPromotion || null,
      controlPlane: result.compilerExplainability.controlPlane || null,
      dataGatewayContract: result.compilerExplainability.dataGatewayContract || null,
      compilerContractLayer: result.compilerExplainability.compilerContractLayer || null,
      surfaceAudit: result.compilerExplainability.surfaceAudit || null,
      driftAssessment: result.compilerExplainability.driftAssessment || null
    } : null
  };
}

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

    return buildHealthSnapshotResponse(result);
  } catch (error) {
    logger.error(`[Tool] get_health_snapshot failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

export default { get_health_snapshot };

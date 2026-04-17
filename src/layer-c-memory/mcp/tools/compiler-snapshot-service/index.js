/**
 * Shared service for building compiler metrics snapshots and health dashboards.
 *
 * The main function delegates to compiler-snapshot-assembly.js for the heavy
 * snapshot assembly work, keeping this file as a thin orchestrator.
 */

import { loadCompilerExplainability } from '../../../../shared/compiler/index.js';
import { createLogger } from '../../../../utils/logger.js';
import { aggregateAlgebraicMetrics, getAlgebraicTopSystems } from '#layer-c/storage/repository/algebraic-query-service.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import {
  buildCanonicalPromotionReport,
  buildCanonicalPromotionSnapshot,
  buildCompilerSystemInventoryReport,
  buildCompilerSystemInventorySnapshot
} from '../../../../shared/compiler/index.js';
import { loadNotifications } from '../status-notifications.js';
import { compactRecentNotifications } from '../../core/notifications.js';
import {
  buildInventoryAndPromotion,
  buildNotificationsWithAlerts,
  buildEnrichedSnapshot,
  buildDashboardAndContracts,
  buildCompilerSnapshotResult
} from '../compiler-snapshot-assembly.js';

const logger = createLogger('OmnySys:mcp:compiler-snapshot');

function resolveCachedExplainability(context = {}) {
  const server = context?.server || null;
  const sharedState = context?.sharedState || server?.sharedState || {};
  return server?.liveInsights?.compilerExplainability
    || server?.liveInsights
    || sharedState.compilerExplainability
    || null;
}

function buildCachedInventoryResult({
  projectPath,
  args,
  context,
  cachedExplainability
}) {
  if (!cachedExplainability) {
    return null;
  }

  if (cachedExplainability.success === true
    && cachedExplainability.systemInventoryDetail
    && cachedExplainability.canonicalPromotionDetail
    && cachedExplainability.compilerExplainability) {
    return cachedExplainability;
  }

  const compilerExplainability = cachedExplainability.compilerExplainability || cachedExplainability;
  const systemInventoryDetail = cachedExplainability.systemInventoryDetail
    || compilerExplainability.systemInventoryDetail
    || compilerExplainability.systemInventory
    || buildCompilerSystemInventorySnapshot({
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    compilerExplainability,
    limit: 10
  });
  const systemInventory = buildCompilerSystemInventoryReport(systemInventoryDetail);
  const canonicalPromotionDetail = cachedExplainability.canonicalPromotionDetail
    || compilerExplainability.canonicalPromotionDetail
    || cachedExplainability.canonicalPromotion
    || compilerExplainability.canonicalPromotion
    || buildCanonicalPromotionSnapshot({
    projectPath,
    scopePath: args?.scopePath || null,
    focusPath: args?.focusPath || null,
    systemInventory
  });

  return {
    success: true,
    _algebraic: false,
    capturedAt: new Date().toISOString(),
    compilerExplainability: {
      ...compilerExplainability,
      systemInventory: systemInventoryDetail,
      canonicalPromotion: canonicalPromotionDetail
    },
    systemInventoryDetail,
    systemInventory,
    canonicalPromotionDetail,
    canonicalPromotion: buildCanonicalPromotionReport(canonicalPromotionDetail),
    healthDashboard: null,
    compactSnapshot: {
      current: {
        totalAtoms: systemInventory?.totalSystemCount || 0,
        policyDriftCount: systemInventory?.policyDriftCount || 0,
        metadataCoverage: systemInventory?.metadataCoveragePct || 0
      }
    },
    observability: null,
    controlPlane: null
  };
}

export async function buildCompilerSnapshotContext(args = {}, context = {}, overrides = {}) {
  const projectPath = context?.projectPath || null;
  const repo = projectPath ? getRepository(projectPath) : null;
  if (!projectPath || !repo) {
    return { success: false, error: 'Project repository unavailable' };
  }
  const sharedState = context?.server?.sharedState || context?.sharedState || {};
  const cachedExplainability = resolveCachedExplainability(context);

  let compilerExplainability;
  const kind = overrides?.snapshotKind || args?.snapshotKind || 'manual';
  const isAlgebraicCandidate = (kind === 'inventory' || args?.algebraic === true) && !args?.forceProcedural;
  const forceFresh = overrides?.forceFresh === true || args?.forceFresh === true;

  if (isAlgebraicCandidate && cachedExplainability && !forceFresh) {
    logger.info('   ⚡ Algebraic cache hit: using live explainability snapshot.');
    return buildCachedInventoryResult({
      projectPath,
      args,
      context,
      cachedExplainability
    });
  }

  if (isAlgebraicCandidate) {
    logger.info('   ⚡ Algebraic Hard-Bypass Triggered: Direct SQL Synthesis Active.');
    try {
      const algebraicData = await aggregateAlgebraicMetrics(projectPath);
      const topSystems = await getAlgebraicTopSystems(projectPath);

      // Synthesize explainability object
      compilerExplainability = {
        _algebraic: true,
        refreshedAt: new Date().toISOString(),
        refreshSource: 'algebraic_sql_hard_bypass',
        policySummary: {
          total: algebraicData.metrics.policyDriftCount || 0,
          effectiveTotal: algebraicData.metrics.policyDriftCount || 0,
          signals: []
        },
        metadataExtractionCoverage: {
          summary: {
            fieldCoveragePct: algebraicData.metrics.metadataCoverage || 0,
            coveragePct: algebraicData.metrics.metadataCoverage || 0
          }
        },
        systemInventory: {
          totalAtoms: algebraicData.metrics.totalAtoms,
          topSystems: topSystems,
          health: algebraicData.metrics.health,
          risks: algebraicData.metrics.risks
        },
        inventorySignals: {
          total: algebraicData.metrics.totalAtoms,
          byType: {}
        },
        driftAssessment: algebraicData.metrics.driftAssessment || { signals: [] }
      };

      // HARD BYPASS: Skip all heavy JS assembly steps
      // Synthesize the final SnapshotResult structure directly
      const result = {
        success: true,
        _algebraic: true,
        capturedAt: new Date().toISOString(),
        compilerExplainability,
        systemInventory: {
          summaryText: `Synthesized Algebraic Inventory: ${algebraicData.metrics.totalAtoms} atoms identified. Metadata Coverage: ${Math.round(algebraicData.metrics.metadataCoverage * 100)}%. Relational Drift: ${algebraicData.metrics.risks.critical} signals.`,
          topSystems,
          summary: {
            totalAtoms: algebraicData.metrics.totalAtoms,
            avgComplexity: algebraicData.metrics.health.complexity,
            avgFragility: algebraicData.metrics.health.fragility,
            avgPropagation: algebraicData.metrics.health.propagation
          }
        },
        systemInventoryDetail: compilerExplainability.systemInventory,
        healthDashboard: {
          summary: compilerExplainability.systemInventory.health,
          trends: { status: 'algebraic_live' }
        },
        compactSnapshot: {
          current: {
            totalAtoms: algebraicData.metrics.totalAtoms,
            policyDriftCount: algebraicData.metrics.policyDriftCount,
            metadataCoverage: algebraicData.metrics.metadataCoverage
          }
        }
      };

      if (context.server) {
        context.server.liveInsights = result;
      }
      sharedState.compilerExplainability = compilerExplainability;
      sharedState.systemInventorySnapshot = compilerExplainability.systemInventory || null;
      sharedState.systemInventoryReport = result.systemInventory || null;
      sharedState.canonicalPromotionSnapshot = compilerExplainability.canonicalPromotion || null;
      sharedState.canonicalPromotionReport = result.canonicalPromotion || null;
      sharedState.compilerExplainabilityDirty = false;
      sharedState.compilerExplainabilityRefreshedAt = new Date().toISOString();

      return result;
    } catch (err) {
      logger.error('   ❌ Algebraic Bypass Failed, falling back to procedural:', err);
      // Fall through to procedural logic if SQL fails
    }
  }

  // Procedural Fallback (Heavy Snapshot - Step 1: Load notifications and compiler explainability)
  const notifications = await loadNotifications(projectPath, context.server, false);
  const compactNotifications = compactRecentNotifications(notifications, { maxLogs: 5, maxWatcherAlerts: 10 });

  compilerExplainability = await loadCompilerExplainability(
    projectPath,
    compactNotifications.watcherAlerts || [],
    sharedState,
    context.server?.fileWatcher?.getFileWatcherStats?.() || null,
    {
      scopePath: args?.scopePath || null,
      focusPath: args?.focusPath || null,
      forceFresh
    }
  );
  if (compilerExplainability && context.server) {
    context.server.liveInsights = compilerExplainability;
  }
  sharedState.systemInventorySnapshot = compilerExplainability?.systemInventory || sharedState.systemInventorySnapshot || null;
  sharedState.systemInventoryReport = compilerExplainability?.systemInventory
    ? buildCompilerSystemInventoryReport(compilerExplainability.systemInventory)
    : sharedState.systemInventoryReport || null;
  sharedState.canonicalPromotionSnapshot = compilerExplainability?.canonicalPromotion || sharedState.canonicalPromotionSnapshot || null;
  sharedState.canonicalPromotionReport = compilerExplainability?.canonicalPromotion
    ? buildCanonicalPromotionReport(compilerExplainability.canonicalPromotion)
    : sharedState.canonicalPromotionReport || null;

  // Step 2: Build inventory and promotion detail
  const { systemInventoryDetail, systemInventory, canonicalPromotionDetail, canonicalPromotion } =
    buildInventoryAndPromotion({ projectPath, args, compilerExplainability });

  // Step 3: Build notifications with governance alerts
  const { mergedNotifications, recentErrors } =
    buildNotificationsWithAlerts({ compactNotifications, compilerExplainability });

  // Step 4: Build enriched metrics snapshot
  const snapshot = buildEnrichedSnapshot({
    projectPath,
    repo,
    args,
    overrides,
    compilerExplainability,
    systemInventory,
    canonicalPromotion,
    context,
    mergedNotifications,
    recentErrors
  });

  // Step 5: Build dashboard, contracts and control plane
  const { contracts } = buildDashboardAndContracts({
    snapshot,
    compilerExplainability,
    mergedNotifications,
    recentErrors,
    systemInventory,
    systemInventoryDetail,
    canonicalPromotion,
    canonicalPromotionDetail,
    args,
    context
  });

  // Step 6: Build final result
  return buildCompilerSnapshotResult({
    projectPath,
    repo,
    notifications,
    compactNotifications,
    recentErrors,
    ...contracts
  });
}

export default { buildCompilerSnapshotContext };

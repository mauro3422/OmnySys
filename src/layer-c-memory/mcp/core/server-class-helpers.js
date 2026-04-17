import { HotReloadManager } from './hot-reload-manager/index.js';

export function resolveRuntimeRestartMode(env, hasProcessSend) {
  const runtimeRestartModeEnv = String(env.OMNYSYS_RUNTIME_RESTART_MODE || '').toLowerCase();
  return runtimeRestartModeEnv === 'manual'
    ? 'manual'
    : runtimeRestartModeEnv === 'auto'
      ? 'auto'
      : (hasProcessSend ? 'auto' : 'manual');
}

export function initializeHotReload(server, logger, hotReloadEnabled = true) {
  if (!hotReloadEnabled) {
    return { enabled: false };
  }

  try {
    server.hotReloadManager = new HotReloadManager(server);
    return { enabled: true, manager: server.hotReloadManager };
  } catch (error) {
    logger.warn('⚠️  Hot-reload failed to start:', error.message);
    return { enabled: false, error };
  }
}

export function initializeRuntimeRestartState(server) {
  server.hotReloadManager = null;
  const hasProcessSend = typeof process.send === 'function';
  server.runtimeRestartMode = resolveRuntimeRestartMode(process.env, hasProcessSend);
  server.proxyManaged = server.runtimeRestartMode === 'auto' && hasProcessSend;
  server._pendingHotReloadRestartFiles = new Set();
  server._hotReloadRestartScheduled = false;
  server._hotReloadRestartTimer = null;
  server._pendingHotReloadChanges = new Map();
  server._hotReloadDeferredDrainTimer = null;
}

/**
 * Marks live insights as dirty and schedules a background refresh.
 */
export function markInsightsDirty(server, scope = {}) {
  if (!server) return;

  server.insightsDirty = true;
  if (server.sharedState && typeof server.sharedState === 'object') {
    server.sharedState.compilerExplainabilityDirty = true;
    server.sharedState.compilerExplainabilityDirtyAt = new Date().toISOString();
    server.sharedState.compilerExplainabilityDirtyScope = {
      updatedAt: new Date().toISOString(),
      filePath: scope.filePath || null,
      atomIds: Array.isArray(scope.atomIds) ? scope.atomIds.slice(0, 50) : [],
      reason: scope.reason || null,
      changeType: scope.changeType || null,
      source: scope.source || 'runtime'
    };
  }
  scheduleBackgroundInsightRefresh(server);
}

/**
 * Schedules a background refresh of the system model (Stage 2).
 * Uses a debounce timer to avoid thrashing during rapid file changes.
 */
export async function scheduleBackgroundInsightRefresh(server) {
  if (!server) return;

  // Clear existing task if pending
  if (server._backgroundInsightTask) {
    clearTimeout(server._backgroundInsightTask);
  }

  server._backgroundInsightTask = setTimeout(async () => {
    try {
      const { buildCompilerSnapshotContext } = await import('../tools/compiler-snapshot-service/index.js');

      const logger = server.logger || console;
      logger.info('   🔄 Starting background Eager Insight Assembly...');
      const startTime = Date.now();

      // We use the shared build context which handles all the assembly
      // but we tell it to use the server.liveInsights as a seed if possible
      const ctx = {
        projectPath: server.projectPath,
        server,
        sharedState: server.sharedState || (server.sharedState = {})
      };

      const result = await buildCompilerSnapshotContext({}, ctx, {
        captureSource: 'background.eager_sync',
        snapshotKind: 'inventory',
        forceFresh: false,
        forceProcedural: true,
        allowAlgebraicBypass: false
      });

      if (result && result.success) {
        server.liveInsights = result;
        server.insightsDirty = false;
        if (server.sharedState && typeof server.sharedState === 'object') {
          server.sharedState.compilerExplainability = result.compilerExplainability || server.sharedState.compilerExplainability || null;
          server.sharedState.compilerExplainabilityDirty = false;
          server.sharedState.compilerExplainabilityRefreshedAt = new Date().toISOString();
        }
        const duration = Date.now() - startTime;
        logger.info(`   ✅ Eager Insight Assembly complete (${duration}ms). System context synchronized.`);
      }
    } catch (error) {
      const logger = server.logger || console;
      logger.error(`   ❌ Background Insight Assembly failed: ${error.message}`);
    } finally {
      server._backgroundInsightTask = null;
    }
  }, server._insightRefreshCooldownMs || 10000);
}

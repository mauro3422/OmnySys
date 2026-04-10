import { createLogger } from '../../../utils/logger.js';
import { buildRestartLifecycleGuidance } from '../../../shared/compiler/index.js';
import { clearPendingRuntimeRestart } from '../core/hot-reload-manager/restart-coordinator.js';
import {
  buildProxyRestartResult,
  buildProcessRestartWarningMessage,
  fastRestartOrchestrator,
  invalidateIncrementalState,
  handleClearCacheOnly,
  handleRefreshOnly,
  clearStandaloneCache,
  refreshRegistry,
  purgeRuntimeCache,
  performSoftReload,
  refreshToolRegistrySafely,
  runFullPipeline,
  stopOrchestrator,
  reloadServerMetadata
} from './index.js';
import { handleProcessRestart } from '../restart-runtime-process.js';

const logger = createLogger('OmnySys:restart:server');

export async function handleRuntimeRestart(args = {}, context = {}) {
  const {
    clearCache = false,
    reanalyze = false,
    reindexOnly = false,
    clearCacheOnly = false,
    refreshOnly = false,
    softReload = false,
    processRestart = false
  } = args;
  const { cache, server, orchestrator, refreshToolRegistry } = context;
  const proxyMode = isProxyMode();
  const requestedMode = getRequestedRestartMode({
    reanalyze,
    reindexOnly,
    clearCacheOnly,
    refreshOnly,
    softReload,
    processRestart
  });

  try {
    logger.info('Restarting OmnySys server...');
    clearPendingHotReloadRestart(server);

    if (reanalyze) {
      logger.warn('reanalyze=true is a destructive full wipe + full reindex. It does not resume prior progress. Use reindexOnly to preserve the DB and continue from the current state.');
    }

    if (refreshOnly) return await handleRefreshOnly(server, cache, refreshToolRegistry);
    if (softReload) return await handleSoftReload(server, orchestrator, cache, refreshToolRegistry);
    if (clearCacheOnly) return await handleClearCacheOnly(cache, refreshToolRegistry);
    if (processRestart) {
      return await handleProcessRestart({
        clearCache,
        reanalyze,
        reindexOnly,
        cache,
        server,
        refreshToolRegistryFn: refreshToolRegistry,
        proxyMode
      });
    }
    if (reindexOnly) {
      const result = {
        restarting: false,
        restartType: 'reindex_only',
        clearCache,
        reanalyze: false,
        timestamp: new Date().toISOString(),
        esmCacheCleared: false
      };

      if (clearCache && cache) {
        await purgeRuntimeCache(cache, 'Reindex-only cache cleared');
        result.cacheCleared = true;
      }

      return await handleReindexOnly(server, cache, result);
    }
    if (isProxyMode()) {
      return await handleProxyRestart({
        clearCache,
        reanalyze,
        clearCacheOnly,
        reindexOnly,
        cache,
        server,
        requestedMode
      });
    }

    logger.info('Running in standalone mode (no proxy). True ESM cache clear requires proxy.');
    logger.info('Recommendation: Run via "npm run mcp" for full restart capability.');

    const result = {
      restarting: true,
      restartType: 'component_restart',
      clearCache,
      reanalyze,
      timestamp: new Date().toISOString(),
      message: 'Server restart initiated (component-only; ESM cache not cleared in standalone mode).',
      esmCacheCleared: false,
      recommendation: 'Use proxy mode (npm run mcp) for full ESM cache clearing'
    };

    if (clearCache && cache) await clearStandaloneCache(cache, reanalyze, server, result);

    await stopOrchestrator(orchestrator);

    if (reanalyze) {
      await runFullPipeline(server, result);
    } else {
      await fastRestartOrchestrator(server, result);
    }

    await refreshRegistry(result, refreshToolRegistry);
    return result;
  } catch (error) {
    logger.error('Error in restart_server:', error.message);
    return {
      error: error.message,
      restarting: false,
      success: false
    };
  }
}

function clearPendingHotReloadRestart(server) {
  clearPendingRuntimeRestart(server);
}

function getRequestedRestartMode({
  reanalyze = false,
  reindexOnly = false,
  clearCacheOnly = false,
  refreshOnly = false,
  softReload = false,
  processRestart = false
} = {}) {
  if (refreshOnly) return 'refresh_only';
  if (softReload) return 'soft_reload';
  if (clearCacheOnly) return 'cache_only_flush';
  if (processRestart) return 'true_process_restart';
  if (reindexOnly) return 'reindex_only';
  if (reanalyze) return 'proxy_reanalyze';
  return null;
}

function buildLegacyProxyRestartMessage(clearCache) {
  const variant = clearCache
    ? 'Legacy proxy restart requested with clearCache=true.'
    : 'Legacy proxy restart requested without an explicit mode.';

  return `${variant} This path kills and respawns the worker via the proxy, may briefly disconnect MCP clients, and should be replaced with an explicit mode such as processRestart=true, clearCacheOnly=true, reindexOnly=true, or clearCache+reanalyze=true.`;
}

async function handleSoftReload(server, orchestrator, cache, refreshToolRegistryFn) {
  logger.info('Soft reload requested...');

  try {
    return await performSoftReload({
      server,
      orchestrator,
      cache,
      refreshToolRegistryFn
    });
  } catch (error) {
    logger.warn('Soft reload failed:', error.message);
    return {
      success: false,
      restarting: false,
      restartType: 'soft_reload_failed',
      lifecycle: buildRestartLifecycleGuidance({ restartType: 'soft_reload', softReload: true }),
      message: `Soft reload failed: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}

function isProxyMode() {
  return process.env.OMNYSYS_PROXY_MODE === '1' || typeof process.send === 'function';
}

async function handleProxyRestart({
  clearCache,
  reanalyze,
  clearCacheOnly,
  reindexOnly,
  cache,
  server,
  requestedMode = null
}) {
  logger.info('Sending restart signal to proxy (true Node.js restart)...');
  const legacyMode = !requestedMode;

  if (clearCache && cache) {
    logger.info('Clearing local cache before restart...');
    await purgeRuntimeCache(cache, null);
    if (reanalyze) {
      logger.warn('reanalyze=true: delegating data cleanup to proxy for a destructive full wipe + full reindex. This is not a resume path.');
    }
  }

  if (process.send) {
    process.send({
      type: 'restart',
      clearCache,
      reanalyze,
      clearCacheOnly,
      reindexOnly,
      processRestart,
      file: 'user_requested',
      reason: clearCacheOnly ? 'clear_cache_only' : reindexOnly ? 'reindex_only' : reanalyze ? 'reanalyze' : 'manual_restart'
    });
  }

  const warningMessage = `
================================================================================
CRITICAL WARNING FOR AI AGENT (ANTIGRAVITY BUG PRE-EMPTION)
You just triggered a true process restart. Because of a known bug in the
Antigravity IDE client, your current MCP session is now orphaned.
Any subsequent MCP tool calls you make right now will silently hang forever.

-> WHAT YOU MUST DO IMMEDIATELY:
1. DO NOT call any other MCP tool.
2. Call the \`notify_user\` tool right now.
3. Tell the user: "I restarted the server. Please manually restart/reload
   Antigravity so the MCP session reconnects, then tell me to continue."
================================================================================
`.trim();

  const baseResult = buildProxyRestartResult({ clearCache, reanalyze, clearCacheOnly, reindexOnly });

  return {
    ...baseResult,
    restartType: requestedMode || (clearCache ? 'legacy_proxy_restart_with_clear_cache' : 'legacy_proxy_restart'),
    legacyMode,
    explicitModeRecommended: legacyMode,
    requestedMode,
    message: legacyMode ? buildLegacyProxyRestartMessage(clearCache) : warningMessage
  };
}

async function handleReindexOnly(server, cache, result) {
  logger.info('ReindexOnly: forcing Layer A re-analysis (DB preserved)...');
  try {
    await invalidateIncrementalState(server);

    const { LayerAAnalysisStep } = await import('./core/initialization/steps/index.js');
    const step = new LayerAAnalysisStep();
    const originalAnalyzed = server._layerAComplete;
    server._layerAComplete = false;

    await step.execute(server);
    server._layerAComplete = originalAnalyzed;

    await reloadServerMetadata({
      cache: server.cache,
      projectPath: server.projectPath,
      wsManager: server.wsManager
    });

    if (cache?.initialize) {
      await cache.initialize();
      if (server.metadata && cache.set) {
        cache.set('metadata', server.metadata);
      }
    }

    if (server.orchestrator && typeof server.orchestrator._startPhase2BackgroundIndexer === 'function') {
      try {
        server.orchestrator._phase2IndexerInstance?.stop?.(false);
      } catch {
        // Best effort cleanup of stale Phase 2 loops.
      }

      server.orchestrator._phase2IndexerInstance = null;
      server.orchestrator.totalPhase2Files = 0;
      await server.orchestrator._startPhase2BackgroundIndexer();
      result.phase2Restarted = true;
    }

    logger.info('Layer A re-analysis complete');
    result.reindexed = true;
  } catch (err) {
    logger.warn('ReindexOnly failed:', err.message);
    result.reindexError = err.message;
  }
  result.success = true;
  result.restartType = 'reindex_only';
  result.lifecycle = buildRestartLifecycleGuidance({
    restartType: 'reindex_only',
    clearCache: result.cacheCleared || false,
    reindexOnly: true
  });
  result.message = 'Layer A re-analysis forced. DB preserved, no process restart.';
  return result;
}

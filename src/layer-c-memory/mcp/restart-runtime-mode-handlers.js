import { buildRestartLifecycleGuidance } from '../../shared/compiler/index.js';
import { createLogger } from '../../utils/logger.js';
import { clearPendingRuntimeRestart } from './core/hot-reload-manager/restart-coordinator.js';

const logger = createLogger('OmnySys:restart:helpers');

export function clearPendingHotReloadRestart(server) {
  clearPendingRuntimeRestart(server);
}

export function getRequestedRestartMode({
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

function isProxyMode() {
  return process.env.OMNYSYS_PROXY_MODE === '1' || typeof process.send === 'function';
}

export async function handleSoftReload(server, orchestrator, cache, refreshToolRegistryFn, { performSoftReload }) {
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

export async function handleProxyRestart({
  clearCache,
  reanalyze,
  clearCacheOnly,
  reindexOnly,
  processRestart = false,
  cache,
  requestedMode = null,
  buildProxyRestartResult,
  purgeRuntimeCache
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

export async function handleReindexOnly(server, cache, result, {
  invalidateIncrementalState,
  runFullIndexing,
  reloadServerMetadata
}) {
  logger.info('ReindexOnly: forcing Layer A re-analysis (DB preserved)...');
  try {
    await invalidateIncrementalState(server);

    logger.info('   Running full reindex without deleting omnysys.db...');
    const indexingResult = await runFullIndexing(server.projectPath);
    server._layerAComplete = true;

    await reloadServerMetadata({
      cache: server.cache,
      projectPath: server.projectPath,
      wsManager: server.wsManager
    });

    result.filesAnalyzed = Object.keys(indexingResult?.files || {}).length;
    result.duration = indexingResult?.duration || 0;

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

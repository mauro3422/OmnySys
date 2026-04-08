import { createLogger } from '../../utils/logger.js';
import { buildRestartLifecycleGuidance } from '../../shared/compiler/index.js';
import { clearPendingRuntimeRestart } from './core/hot-reload-manager/restart-coordinator.js';
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
  stopOrchestrator
} from './restart-runtime-helpers.js';

const logger = createLogger('OmnySys:restart:server');

// Cooldown to prevent restart loops. Shared with hot-reload-manager.
const RESTART_COOLDOWN_MS = 60000;
let _lastRestartAt = 0;

function isRestartCooldownActive() {
  const now = Date.now();
  return _lastRestartAt > 0 && (now - _lastRestartAt) < RESTART_COOLDOWN_MS;
}

function recordRestartTime() {
  _lastRestartAt = Date.now();
}

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

  try {
    logger.info('Restarting OmnySys server...');
    clearPendingHotReloadRestart(server);

    if (reanalyze) {
      logger.warn('reanalyze=true is a destructive full wipe + full reindex. It does not resume prior progress. Use reindexOnly to preserve the DB and continue from the current state.');
    }

    if (refreshOnly) return await handleRefreshOnly(server, cache, refreshToolRegistry);
    if (softReload) return await handleSoftReload(server, orchestrator, cache, refreshToolRegistry);
    if (clearCacheOnly) return await handleClearCacheOnly(cache, refreshToolRegistry);
    if (processRestart) return await handleProcessRestart(clearCache, reanalyze, reindexOnly, cache, server, refreshToolRegistry);
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
      return await handleProxyRestart(clearCache, reanalyze, clearCacheOnly, reindexOnly, cache, server);
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

/**
 * Process restart: kills the Node.js process and respawns it via the proxy.
 *
 * What it DOES:
 *   ✅ Kills and respawns the worker process (fresh ESM module cache)
 *   ✅ Preserves omnysys.db (active atoms, files, relations, etc.)
 *   ✅ Preserves atom-history.db (version evolution archive)
 *   ✅ Preserves health-history.db (metrics snapshots)
 *   ✅ Does NOT trigger Layer A reindex (file watcher handles this)
 *
 * What it does NOT:
 *   ❌ Does NOT delete any database files
 *   ❌ Does NOT clear file_hashes or force reindex
 *   ❌ Does NOT re-analyze code (watcher picks up changes incrementally)
 *
 * When to use:
 *   After editing code and the changes aren't reflected because the old
 *   ESM module cache is still serving stale code. The file watcher will
 *   reindex modified files automatically — no manual reindex needed.
 */
async function handleProcessRestart(clearCache, reanalyze, reindexOnly, cache, server, refreshToolRegistryFn) {
  // COOLDOWN CHECK: Prevent restart loops. After a processRestart, the file
  // watcher may detect residual changes (new files from refactor, etc.).
  // We suppress restarts for 60s to let Phase 2 settle.
  if (isRestartCooldownActive()) {
    const remaining = Math.round((RESTART_COOLDOWN_MS - (Date.now() - _lastRestartAt)) / 1000);
    logger.warn(`⏳ Restart suppressed (cooldown: ${remaining}s remaining). Skipping to prevent loop.`);
    return {
      success: true,
      restarting: false,
      restartType: 'cooldown_suppressed',
      message: `Restart suppressed — cooldown active (${remaining}s remaining). File watcher will reindex changes incrementally.`,
      databasesPreserved: ['omnysys.db', 'atom-history.db', 'health-history.db'],
      timestamp: new Date().toISOString()
    };
  }

  logger.info('Process restart requested — killing worker, preserving all databases...');

  if (!isProxyMode()) {
    logger.warn('processRestart=true requires proxy mode. In standalone mode, only cache can be cleared.');
    await purgeRuntimeCache(cache, 'Standalone cache cleared');
    await refreshToolRegistrySafely(refreshToolRegistryFn, 'Tool registry refreshed');
    return {
      success: true,
      restarting: false,
      restartType: 'process_restart_standalone',
      lifecycle: buildRestartLifecycleGuidance({ restartType: 'process_restart_standalone', processRestart: true }),
      message: 'Standalone mode: ESM cache cleared but true process restart requires proxy (npm run mcp). DB preserved, no reindex.',
      databasesPreserved: ['omnysys.db', 'atom-history.db', 'health-history.db'],
      timestamp: new Date().toISOString()
    };
  }

  // Proxy mode: signal proxy to kill worker and respawn with --processRestart flag
  // CRITICAL: Don't log here — proxy will log if it actually executes.
  // The proxy may block this due to its own cooldown (survives across worker restarts).
  recordRestartTime();
  if (process.send) {
    process.send({
      type: 'restart',
      clearCache: false,       // DON'T clear analysis cache
      reanalyze: false,         // DON'T delete DB
      reindexOnly: false,       // DON'T force reindex
      processRestart: true,     // JUST kill and respawn worker
      file: 'user_requested_process_restart',
      reason: 'manual_process_restart_via_mcp_tool'
    });
  }

  const lifecycle = buildRestartLifecycleGuidance({
    restartType: 'process_restart',
    proxyMode: true,
    processRestart: true
  });

  return {
    success: true,
    restarting: true,
    restartType: 'true_process_restart',
    processRestart: true,
    databasesPreserved: ['omnysys.db', 'atom-history.db', 'health-history.db'],
    lifecycle,
    message: buildProcessRestartWarningMessage(),
    timestamp: new Date().toISOString()
  };
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

async function handleProxyRestart(clearCache, reanalyze, clearCacheOnly, reindexOnly, cache, server) {
  logger.info('Sending restart signal to proxy (true Node.js restart)...');

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

  return {
    ...buildProxyRestartResult({ clearCache, reanalyze, clearCacheOnly, reindexOnly }),
    message: warningMessage
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

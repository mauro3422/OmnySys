import { createLogger } from '../../utils/logger.js';
import { buildRestartLifecycleGuidance } from '../../shared/compiler/index.js';

const logger = createLogger('OmnySys:restart:server');

export async function handleRuntimeRestart(args = {}, context = {}) {
  const { clearCache = false, reanalyze = false, reindexOnly = false, clearCacheOnly = false } = args;
  const { cache, server, orchestrator, refreshToolRegistry } = context;

  try {
    logger.info('Restarting OmnySys server...');
    clearPendingHotReloadRestart(server);

    if (clearCacheOnly) return await handleClearCacheOnly(cache, refreshToolRegistry);
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
        await cache.clear();
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
  server?._pendingHotReloadRestartFiles?.clear?.();
  if (server) {
    server._hotReloadRestartScheduled = false;
  }
  if (server?._hotReloadRestartTimer) {
    clearTimeout(server._hotReloadRestartTimer);
    server._hotReloadRestartTimer = null;
  }
}

async function handleClearCacheOnly(cache, refreshToolRegistryFn) {
  logger.info('Cache-only flush requested...');
  if (cache) {
    await cache.clear();
    logger.info('In-memory cache cleared');
  }
  try {
    await refreshToolRegistryFn?.(logger);
    logger.info('Tool registry refreshed');
  } catch {
    // Best effort in non-HTTP runtimes.
  }
  return {
    success: true,
    restarting: false,
    restartType: 'cache_only_flush',
    lifecycle: buildRestartLifecycleGuidance({ restartType: 'cache_only_flush', clearCacheOnly: true }),
    message: 'In-memory cache flushed and tool registry refreshed. No reindex needed.',
    timestamp: new Date().toISOString()
  };
}

function isProxyMode() {
  return process.env.OMNYSYS_PROXY_MODE === '1' || typeof process.send === 'function';
}

async function handleProxyRestart(clearCache, reanalyze, clearCacheOnly, reindexOnly, cache, server) {
  logger.info('Sending restart signal to proxy (true Node.js restart)...');

  if (clearCache && cache) {
    logger.info('Clearing local cache before restart...');
    await cache.clear();
    if (reanalyze) {
      logger.info('reanalyze=true: delegating data cleanup to proxy to avoid Windows file locks.');
    }
  }

  if (process.send) {
    process.send({ type: 'restart', clearCache, reanalyze, clearCacheOnly, reindexOnly });
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
    success: true,
    restarting: true,
    restartType: 'true_process_restart',
    lifecycle: buildRestartLifecycleGuidance({
      restartType: 'true_process_restart',
      proxyMode: true,
      clearCache,
      reanalyze,
      reindexOnly,
      clearCacheOnly
    }),
    clearCache,
    reanalyze,
    timestamp: new Date().toISOString(),
    message: warningMessage,
    esmCacheCleared: true
  };
}

async function clearStandaloneCache(cache, reanalyze, server, result) {
  logger.info('Clearing cache...');
  await cache.clear();

  if (reanalyze) {
    logger.info('Deleting previous analysis (full reindex)...');
    const fs = await import('fs/promises');
    const path = await import('path');
    const dataDir = path.join(server.projectPath, '.omnysysdata');

    try {
      const dbFiles = ['omnysys.db', 'omnysys.db-wal', 'omnysys.db-shm'];
      for (const file of dbFiles) {
        await fs.unlink(path.join(dataDir, file)).catch(() => {});
      }
      const legacyFiles = ['index.json', 'atom-versions.json'];
      for (const file of legacyFiles) {
        await fs.unlink(path.join(dataDir, file)).catch(() => {});
      }
      logger.info('Previous analysis deleted (SQLite DB + legacy files)');
      result.analysisCleared = true;
    } catch (err) {
      logger.warn('Could not delete previous analysis:', err.message);
    }
  }
  result.cacheCleared = true;
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

    if (typeof server.reloadMetadata === 'function') {
      await server.reloadMetadata();
    }

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

async function invalidateIncrementalState(server) {
  if (!server?.projectPath) return;

  const { getRepository } = await import('#layer-c/storage/repository/index.js');
  const repo = getRepository(server.projectPath);
  const db = repo?.db || repo?.getDatabase?.();

  if (!db) return;

  try {
    db.prepare('DELETE FROM file_hashes').run();
  } catch {}

  try {
    db.prepare('UPDATE files SET hash = NULL WHERE hash IS NOT NULL').run();
  } catch {}
}

async function stopOrchestrator(orchestrator) {
  logger.info('Stopping orchestrator...');
  if (orchestrator) {
    try {
      await orchestrator.stop();
      logger.info('Orchestrator stopped');
    } catch (err) {
      logger.warn('Error stopping orchestrator:', err.message);
    }
  }
}

async function runFullPipeline(server, result) {
  logger.info('reanalyze=true: running full pipeline (LayerA + Cache + Orchestrator)...');

  if (server._healthBeacon) {
    try {
      await new Promise((resolve) => server._healthBeacon.close(resolve));
      server._healthBeacon = null;
    } catch {
      server._healthBeacon = null;
    }
  }

  server.initialized = false;
  server.orchestrator = null;
  server.cache = null;
  server.startTime = Date.now();

  try {
    const { InitializationPipeline } = await import('./core/initialization/pipeline.js');
    const { LLMSetupStep, LayerAAnalysisStep, OrchestratorInitStep, CacheInitStep, ReadyStep } =
      await import('./core/initialization/steps/index.js');

    server.pipeline = new InitializationPipeline([
      new LayerAAnalysisStep(),
      new CacheInitStep(),
      new LLMSetupStep(),
      new OrchestratorInitStep(),
      new ReadyStep()
    ]);

    const initResult = await server.pipeline.execute(server);

    if (initResult.success) {
      server.initialized = true;
      logger.info('Full pipeline completed');
      result.success = true;
      result.componentsRestarted = ['LayerA', 'Cache', 'LLM', 'Orchestrator'];
    } else {
      throw new Error(`Pipeline failed at: ${initResult.failedAt || initResult.haltedAt}`);
    }
  } catch (pipelineErr) {
    logger.error('Error in full pipeline:', pipelineErr.message);
    result.success = false;
    result.error = pipelineErr.message;
  }
}

async function fastRestartOrchestrator(server, result) {
  logger.info('Fast restart: restarting orchestrator only (no LayerA)...');
  try {
    const { OrchestratorInitStep } = await import('./core/initialization/steps/index.js');
    const step = new OrchestratorInitStep();
    await step.execute(server);
    server.initialized = true;
    logger.info('Orchestrator restarted');
    result.success = true;
    result.componentsRestarted = ['Orchestrator'];
    result.message = 'Fast restart complete. Orchestrator restarted, tool registry refreshed. No Layer A reindex.';
  } catch (orchErr) {
    logger.error('Error restarting orchestrator:', orchErr.message);
    result.success = false;
    result.error = orchErr.message;
  }
}

async function refreshRegistry(result, refreshToolRegistryFn) {
  try {
    await refreshToolRegistryFn?.(logger);
    logger.info('Tool registry refreshed after restart');
    result.toolRegistryRefreshed = true;
  } catch (refreshErr) {
    logger.warn('Tool registry refresh skipped:', refreshErr.message);
    result.toolRegistryRefreshed = false;
  }
}

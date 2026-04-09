import { buildRestartLifecycleGuidance } from '../../shared/compiler/index.js';
import { createLogger } from '../../utils/logger.js';
import { shouldPreserveHistoryArtifact } from '#shared/utils/normalize-helpers.js';
import { reloadMetadata as reloadServerMetadata } from '../../core/unified-server/initialization/analysis-manager.js';

export { reloadServerMetadata };

const logger = createLogger('OmnySys:restart:helpers');

export async function invalidateIncrementalState(server) {
  if (!server?.projectPath) return;

  const { getRepository } = await import('#layer-c/storage/repository/index.js');
  const repo = getRepository(server.projectPath);
  const db = repo?.db || repo?.getDatabase?.();

  if (!db) return;

  try {
    db.prepare('DELETE FROM file_hashes').run();
  } catch {}

  // files.hash column deprecated: ya no se limpia, file_hashes es la fuente de verdad
}

export async function stopOrchestrator(orchestrator) {
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

export async function runFullPipeline(server, result) {
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

export async function fastRestartOrchestrator(server, result) {
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

export async function refreshRegistry(result, refreshToolRegistryFn) {
  try {
    await refreshToolRegistryFn?.(logger);
    logger.info('Tool registry refreshed after restart');
    result.toolRegistryRefreshed = true;
  } catch (refreshErr) {
    logger.warn('Tool registry refresh skipped:', refreshErr.message);
    result.toolRegistryRefreshed = false;
  }
}

export async function refreshToolRegistrySafely(refreshToolRegistryFn, successMessage, failureMessage = 'Tool registry refresh skipped') {
  try {
    await refreshToolRegistryFn?.(logger);
    if (successMessage) {
      logger.info(successMessage);
    }
    return true;
  } catch (refreshErr) {
    logger.warn(`${failureMessage}: ${refreshErr.message}`);
    return false;
  }
}

export async function performSoftReload({ server, orchestrator, cache, refreshToolRegistryFn }) {
  try {
    await stopOrchestrator(orchestrator);
    if (orchestrator) {
      await fastRestartOrchestrator(server, {});
    }

    if (cache?.initialize) {
      await cache.initialize();
      if (server.metadata && cache.set) {
        cache.set('metadata', server.metadata);
      }
    }

    await refreshToolRegistrySafely(refreshToolRegistryFn);

    return {
      success: true,
      restarting: false,
      restartType: 'soft_reload',
      lifecycle: buildRestartLifecycleGuidance({ restartType: 'soft_reload', softReload: true }),
      message: 'Soft reload complete. Orchestrator and runtime state refreshed without process restart.',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.warn(`Soft reload failed: ${error.message}`);
    return {
      success: false,
      restarting: false,
      restartType: 'soft_reload',
      error: error.message,
      lifecycle: buildRestartLifecycleGuidance({ restartType: 'soft_reload', softReload: true }),
      message: 'Soft reload failed. Runtime state remains unchanged.',
      timestamp: new Date().toISOString()
    };
  }
}

export async function handleRefreshOnly(server, cache, refreshToolRegistryFn) {
  logger.info('Refresh-only requested...');

  await purgeRuntimeCache(cache, 'Runtime cache cleared');

  try {
    await reloadServerMetadata({
      cache,
      projectPath: server?.projectPath,
      wsManager: server?.wsManager
    });
  } catch (error) {
    logger.warn('Metadata refresh skipped:', error.message);
  }

  await refreshToolRegistrySafely(refreshToolRegistryFn, 'Tool registry refreshed');

  return {
    success: true,
    restarting: false,
    restartType: 'refresh_only',
    lifecycle: buildRestartLifecycleGuidance({ restartType: 'refresh_only', refreshOnly: true }),
    message: 'Runtime refreshed without restart. Cache and metadata reloaded.',
    timestamp: new Date().toISOString()
  };
}

export async function handleClearCacheOnly(cache, refreshToolRegistryFn) {
  logger.info('Cache-only flush requested...');
  await purgeRuntimeCache(cache, 'In-memory cache cleared');
  await refreshToolRegistrySafely(refreshToolRegistryFn, 'Tool registry refreshed');
  return {
    success: true,
    restarting: false,
    restartType: 'cache_only_flush',
    lifecycle: buildRestartLifecycleGuidance({ restartType: 'cache_only_flush', clearCacheOnly: true }),
    message: 'In-memory cache flushed and tool registry refreshed. No reindex needed.',
    timestamp: new Date().toISOString()
  };
}

export async function clearStandaloneCache(cache, reanalyze, server, result) {
  logger.info('Clearing cache...');
  await purgeRuntimeCache(cache, null);

  if (reanalyze) {
    logger.warn('Deleting previous analysis for reanalyze=true. This resets progress and starts a full reindex from scratch.');
    const fs = await import('fs/promises');
    const path = await import('path');
    const dataDir = path.join(server.projectPath, '.omnysysdata');

    try {
      const dbFiles = ['omnysys.db', 'omnysys.db-wal', 'omnysys.db-shm'];
      const legacyFiles = ['index.json', 'atom-versions.json'];
      for (const file of dbFiles) {
        if (shouldPreserveHistoryArtifact(file)) continue;
        await fs.unlink(path.join(dataDir, file)).catch(() => {});
      }
      for (const file of legacyFiles) {
        if (shouldPreserveHistoryArtifact(file)) continue;
        await fs.unlink(path.join(dataDir, file)).catch(() => {});
      }
      logger.info('Previous analysis deleted (SQLite DB + legacy files)');
      result.analysisCleared = true;
    } catch (error) {
      logger.warn('Could not delete previous analysis:', error.message);
      result.analysisCleared = false;
    }
  }
}

export async function purgeRuntimeCache(cache, message = 'Cache cleared') {
  if (!cache?.purge) {
    return false;
  }

  await cache.purge();
  if (message) {
    logger.info(message);
  }

  return true;
}

export function buildProcessRestartWarningMessage() {
  return `
================================================================================
PROCESS RESTART INITIATED (processRestart=true)

What happened:
  • Worker process is being killed and respawned by the proxy
  • Fresh ESM module cache — your code changes are now loaded
  • ALL databases preserved (omnysys.db, atom-history.db, health-history.db)
  • NO reindex triggered — file watcher handles changed files automatically

What to expect:
  • Brief MCP disconnect while the bridge replays initialize and reconnects
  • The bridge should recover automatically; wait until it reports reconnected
  • If your client still does not reconnect, reload the IDE extension once
================================================================================
`.trim();
}

export function buildProxyRestartResult({ clearCache, reanalyze, clearCacheOnly, reindexOnly }) {
  const restartType = reanalyze
    ? 'proxy_reanalyze'
    : (clearCache ? 'legacy_proxy_restart_with_clear_cache' : 'legacy_proxy_restart');
  const retryAfterMs = reanalyze ? 15000 : 5000;

  return {
    success: true,
    restarting: true,
    restartType,
    bridgeRecovery: {
      trigger: 'server rejected request after daemon restart',
      forceFreshSession: true,
      retryAfterMs
    },
    lifecycle: buildRestartLifecycleGuidance({
      restartType,
      proxyMode: true,
      clearCache,
      reanalyze,
      reindexOnly,
      clearCacheOnly
    }),
    clearCache,
    reanalyze,
    timestamp: new Date().toISOString(),
    message: 'Proxy-managed restart requested.',
    esmCacheCleared: true
  };
}

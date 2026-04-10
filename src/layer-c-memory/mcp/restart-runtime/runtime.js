import { createLogger } from '../../../utils/logger.js';
import {
  buildProxyRestartResult,
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
import { runFullIndexing } from '../core/analysis-checker/index-runner.js';
import { handleProcessRestart } from '../restart-runtime-process.js';
import {
  clearPendingHotReloadRestart,
  getRequestedRestartMode,
  handleProxyRestart,
  handleReindexOnly,
  handleSoftReload
} from '../restart-runtime-mode-handlers.js';

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
    if (softReload) return await handleSoftReload(server, orchestrator, cache, refreshToolRegistry, { performSoftReload });
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

      return await handleReindexOnly(server, cache, result, {
        invalidateIncrementalState,
        runFullIndexing,
        reloadServerMetadata
      });
    }
    if (isProxyMode()) {
      return await handleProxyRestart({
        clearCache,
        reanalyze,
        clearCacheOnly,
        reindexOnly,
        processRestart,
        cache,
        requestedMode,
        buildProxyRestartResult,
        purgeRuntimeCache
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

function isProxyMode() {
  return process.env.OMNYSYS_PROXY_MODE === '1' || typeof process.send === 'function';
}

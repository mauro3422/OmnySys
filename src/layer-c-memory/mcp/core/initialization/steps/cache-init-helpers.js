import { initializeEmptyCache } from '#core/unified-server/initialization/cache-manager.js';

export function applyCriticalCacheData(server, preload) {
  server.metadata = preload.metadata;
  server.cache.set('metadata', preload.metadata);
  server.cache.set('connections', preload.connections);
  server.cache.set('assessment', preload.assessment);
}

export function createHydratedEmptyCache() {
  const cache = {
    index: { entries: {}, metadata: { totalFiles: 0, totalDependencies: 0 } },
    ramCache: new Map(),
    set(key, value) {
      this[key] = value;
    },
    setRamCache(key, value) {
      this.ramCache.set(key, value);
    },
    get(key) {
      if (this.ramCache?.has?.(key)) {
        return this.ramCache.get(key);
      }
      return this[key];
    },
    purge() {
      this.index = { entries: {}, metadata: { totalFiles: 0, totalDependencies: 0 } };
      this.ramCache = new Map();
    },
    getCacheStats() {
      return { status: 'fallback', totalFiles: 0, totalDependencies: 0 };
    }
  };

  initializeEmptyCache(cache);
  return cache;
}

export function countAssessmentIssues(assessment) {
  if (!assessment?.report?.summary) {
    return 0;
  }

  const summary = assessment.report.summary;
  return (summary.criticalCount || 0)
    + (summary.highCount || 0)
    + (summary.mediumCount || 0)
    + (summary.lowCount || 0);
}

export function shouldDeferCriticalCachePreload(server) {
  const startupLayerAResult = server?.startupLayerAResult;
  if (!startupLayerAResult?.ran) {
    return false;
  }

  return startupLayerAResult.incremental !== true;
}

export function buildLightweightCacheMetadata(cache) {
  const totalFiles = Number(cache?.index?.metadata?.totalFiles || 0);
  const totalAtoms = Number(cache?.index?.metadata?.totalAtoms || 0);
  const totalDependencies = Number(cache?.index?.metadata?.totalDependencies || 0);

  return {
    stats: {
      totalFiles,
      totalAtoms,
      totalDependencies
    },
    totalFiles,
    totalAtoms,
    fileIndex: {},
    files: [],
    deferred: true,
    source: 'cache_lightweight_bootstrap'
  };
}

export function seedDeferredCachePlaceholders(server, cache) {
  const metadata = buildLightweightCacheMetadata(cache);
  server.metadata = metadata;
  cache.set('metadata', metadata);
  cache.set('connections', {
    sharedState: [],
    eventListeners: [],
    total: 0,
    deferred: true,
    derivedFrom: 'deferred_cache_preload'
  });
  cache.set('assessment', {
    report: { summary: {} },
    deferred: true,
    source: 'deferred_cache_preload'
  });
  return metadata;
}

export async function waitForDeferredPreloadWindow(
  server,
  {
    initialDelayMs = 5000,
    maxAttempts = 60,
    pollMs = 2000
  } = {}
) {
  await new Promise((resolve) => setTimeout(resolve, initialDelayMs));

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const phase2Status = server.orchestrator?.phase2Status;
    if (!phase2Status?.inProgress) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

export function scheduleDeferredCachePreload(server, loadCriticalData, logger) {
  if (server._deferredCachePreloadTask) {
    return server._deferredCachePreloadTask;
  }

  server._deferredCachePreloadTask = (async () => {
    await waitForDeferredPreloadWindow(server);
    const preload = await loadCriticalData(server.projectPath);
    applyCriticalCacheData(server, preload);
    server.cachePreloadDeferred = false;
    logger.info(`Deferred cache preload completed (${preload.connections.total} connections, ${countAssessmentIssues(preload.assessment)} issues).`);
    return preload;
  })().catch((error) => {
    logger.warn(`Deferred cache preload failed: ${error.message}`);
    return null;
  });

  return server._deferredCachePreloadTask;
}

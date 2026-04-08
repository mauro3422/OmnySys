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

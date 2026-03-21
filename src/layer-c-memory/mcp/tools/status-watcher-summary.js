import { normalizeCount } from '../../../shared/compiler/index.js';

export function compactWatcherSummary(watcher) {
  if (!watcher || typeof watcher !== 'object') return null;

  const originCounts = watcher.originCounts || watcher.changeOrigins || {};
  const surfaceCounts = watcher.surfaceCounts || {};

  return {
    isRunning: watcher.isRunning !== false,
    pendingChanges: normalizeCount(watcher.pendingChanges),
    trackedFiles: normalizeCount(watcher.trackedFiles),
    startupNoiseSuppressed: normalizeCount(watcher.startupNoiseSuppressed),
    totalChanges: normalizeCount(watcher.totalChanges),
    processedChanges: normalizeCount(watcher.processedChanges),
    failedChanges: normalizeCount(watcher.failedChanges),
    lastProcessedAt: watcher.lastProcessedAt || null,
    lastChangeAt: watcher.lastChangeAt || null,
    lastChangeOrigin: watcher.lastChangeOrigin || null,
    lastChangeSurface: watcher.lastChangeSurface || null,
    originCounts: {
      filesystem: normalizeCount(originCounts.filesystem),
      manual: normalizeCount(originCounts.manual),
      api: normalizeCount(originCounts.api),
      atomic: normalizeCount(originCounts.atomic),
      unknown: normalizeCount(originCounts.unknown)
    },
    surfaceCounts: {
      code: normalizeCount(surfaceCounts.code),
      manifest: normalizeCount(surfaceCounts.manifest),
      buildConfig: normalizeCount(surfaceCounts['build-config'] || surfaceCounts.buildConfig),
      dependencyMetadata: normalizeCount(surfaceCounts['dependency-metadata'] || surfaceCounts.dependencyMetadata),
      provenanceOnly: normalizeCount(surfaceCounts['provenance-only'] || surfaceCounts.provenanceOnly),
      ignored: normalizeCount(surfaceCounts.ignored),
      unknown: normalizeCount(surfaceCounts.unknown)
    }
  };
}

export default {
  compactWatcherSummary
};

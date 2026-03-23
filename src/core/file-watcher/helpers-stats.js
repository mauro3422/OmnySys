import { createStatsGetter } from '../../shared/utils/stats-pool.js';

export const getWatcherStats = createStatsGetter('watcher', function buildWatcherStats(pooled) {
  return {
    ...pooled,
    isRunning: this.isRunning,
    pendingChanges: this.pendingChanges?.size || 0,
    trackedFiles: this.fileHashes?.size || 0,
    startupNoiseSuppressed: this.startupNoiseSuppressed || 0,
    startupSuppressionWindowMs: 1500,
    originCounts: { ...(this.changeOrigins || {}) },
    lastChangeOrigin: this.lastChangeOrigin || null,
    lastChangeAt: this.lastChangeAt || null,
    surfaceCounts: { ...(this.surfaceCounts || {}) },
    lastChangeSurface: this.lastChangeSurface || null
  };
});

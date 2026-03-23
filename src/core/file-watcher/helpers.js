export {
  WATCHER_SURFACE_KIND,
  classifyWatcherSurface,
  isRelevantFile,
  shouldIgnore
} from './helpers-surface.js';

export {
  buildWatcherChangeInfo,
  emitWatcherSurfaceChange,
  normalizeWatcherOrigin,
  queueWatcherChange,
  recordWatcherOrigin,
  recordWatcherSurface,
  shouldSkipModifiedWatcherChange
} from './helpers-change.js';

export { getStats } from './helpers-stats.js';

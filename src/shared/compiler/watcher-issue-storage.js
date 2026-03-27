/**
 * @fileoverview Shared storage helpers for watcher diagnostics.
 *
 * Keeps path normalization and stale snapshot detection reusable across
 * FileWatcher persistence/runtime surfaces.
 *
 * @module shared/compiler/watcher-issue-storage
 */

export {
  normalizeWatcherIssueFilePath
} from './watcher-issue-storage-paths.js';

export {
  findOrphanedWatcherAlertIds
} from './watcher-issue-storage-alerts.js';

export {
  findOutdatedWatcherAlertIds
} from './watcher-issue-storage-runtime.js';

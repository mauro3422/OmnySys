/**
 * @fileoverview Deferred hot-reload change flow helpers.
 *
 * Keeps the HotReloadManager index small by isolating queueing, draining and
 * reload-policy logic.
 *
 * @module hot-reload-manager/change-flow
 */

import { createLogger } from '../../../utils/logger.js';
import { FileWatcher } from './watchers/file-watcher.js';
import {
  buildHotReloadConformanceContext,
  dispatchReloadableChange
} from './change-flow-actions.js';
import {
  drainDeferredChanges,
  getChangePriority,
  queueDeferredChange,
  shouldDeferChange
} from './change-flow-deferred.js';

const logger = createLogger('OmnySys:hot-reload');

export function createManagedFileWatcher(server, onChange) {
  return new FileWatcher({
    projectPath: server.projectPath,
    onChange,
    debounceMs: 500
  });
}

export function handleReloadableChange({ eventType, filename, server, classifier, reloadHandler }) {
  if (shouldDeferChange(server)) {
    queueDeferredChange(server, { eventType, filename, server, classifier, reloadHandler }, drainDeferredChangesBound);
    logger.debug(`Deferring hot-reload while indexing/mutating: ${filename}`);
    return;
  }

  processReloadableChange({ eventType, filename, server, classifier, reloadHandler });
}

export function snapshotWatcherStats(fileWatcher) {
  return fileWatcher?.getFileWatcherStats?.() || {};
}

function drainDeferredChangesBound(server) {
  drainDeferredChanges(server, processReloadableChange, getChangePriority);
}

function processReloadableChange({
  eventType,
  filename,
  server,
  classifier,
  reloadHandler,
  recoveryContext
}) {
  if (!server) {
    logger.warn(`Skipping hot-reload change without server context: ${filename}`);
    return;
  }

  if (reloadHandler.isReloading) {
    logger.debug(`Ignoring change during reload: ${filename}`);
    return;
  }

  const moduleInfo = classifier.classify(filename);
  const runtimeContext = recoveryContext || buildHotReloadConformanceContext({ filename, server });
  dispatchReloadableChange({ eventType, filename, server, moduleInfo, reloadHandler, runtimeContext });
}

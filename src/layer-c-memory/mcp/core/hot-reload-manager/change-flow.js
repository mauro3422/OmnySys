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
import { classifyRuntimeChange, RuntimeChangeAction } from './policy/runtime-change-policy.js';
import { queueRuntimeRestart } from './restart-coordinator.js';
import { isMutationBatchActive } from '../shared/mutation-batch.js';
import {
  buildRestartLifecycleGuidance,
  evaluateAtomRefactoringSignals
} from '../../../../shared/compiler/index.js';

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
    queueDeferredChange(server, { eventType, filename, server, classifier, reloadHandler });
    logger.debug(`Deferring hot-reload while indexing/mutating: ${filename}`);
    return;
  }

  processReloadableChange({ eventType, filename, server, classifier, reloadHandler });
}

export function snapshotWatcherStats(fileWatcher) {
  return fileWatcher?.getFileWatcherStats?.() || {};
}

function buildHotReloadConformanceContext({ filename, server }) {
  return {
    restartLifecycle: buildRestartLifecycleGuidance({ restartType: 'hot_reload_runtime_restart', proxyMode: server?.runtimeRestartMode === 'auto' }),
    semanticSignals: evaluateAtomRefactoringSignals({
      name: filename,
      filePath: filename,
      isAsync: true,
      hasErrorHandling: true,
      semantic: { isPure: false, mutatesParams: ['server'], usesThisContext: false, hasReturnValue: true },
      sharedStateAccess: ['_pendingHotReloadChanges', '_hotReloadDeferredDrainTimer'],
      eventEmitters: ['server.emit']
    })
  };
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

  if (isServerIndexing(server)) {
    logger.debug(`Ignoring change during indexing: ${filename}`);
    return;
  }

  if (isMutationBatchActive(server)) {
    logger.debug(`Deferring reload during mutation batch: ${filename}`);
    return;
  }

  const moduleInfo = classifier.classify(filename);
  const policy = classifyRuntimeChange(filename, moduleInfo);
  const runtimeContext = recoveryContext || buildHotReloadConformanceContext({ filename, server });
  dispatchReloadableChange({ eventType, filename, server, moduleInfo, policy, reloadHandler, runtimeContext });
}

function dispatchReloadableChange({
  eventType,
  filename,
  server,
  moduleInfo,
  policy,
  reloadHandler,
  runtimeContext
}) {
  switch (policy.action) {
    case RuntimeChangeAction.IGNORE:
      logger.debug(`Ignoring non-runtime file: ${filename}`);
      return;
    case RuntimeChangeAction.REFRESH: return applyRefreshChange({ eventType, filename, server, moduleInfo, policy, reloadHandler, runtimeContext });
    case RuntimeChangeAction.RESTART: return applyRestartChange({ filename, server, policy });
    case RuntimeChangeAction.REINDEX: return applyReindexChange({ eventType, filename, server, moduleInfo, policy, runtimeContext });
    default: return applyRuntimeReloadChange({ eventType, filename, moduleInfo, reloadHandler });
  }
}

function applyRefreshChange({
  eventType,
  filename,
  server,
  moduleInfo,
  policy,
  reloadHandler,
  runtimeContext
}) {
  logger.info(`♻️ Refresh-worthy change detected: ${filename} (${moduleInfo?.type || policy.reason}/${eventType})`);
  server.emit('hot-reload:refresh-requested', {
    file: filename,
    reason: policy.reason,
    action: policy.action,
    lifecycle: runtimeContext.restartLifecycle,
    semanticSignals: runtimeContext.semanticSignals
  });
  reloadHandler.applyModuleReload(filename, moduleInfo);
}

function applyRestartChange({ filename, server, policy }) {
  logger.warn(`🚨 Runtime restart required: ${filename} (${policy.reason})`);
  queueRuntimeRestart(server, {
    filename,
    reason: policy.reason,
    eventName: 'hot-reload:restart-pending'
  });
}

function applyReindexChange({
  eventType,
  filename,
  server,
  moduleInfo,
  policy,
  runtimeContext
}) {
  logger.info(`♻️ Reindex-worthy change detected: ${filename} (${moduleInfo?.type || policy.reason}/${eventType})`);
  server.emit('hot-reload:reindex-requested', {
    file: filename,
    reason: policy.reason,
    action: policy.action,
    runtimeReloadDeferred: true,
    runtimeRestartMode: server?.runtimeRestartMode || 'manual',
    lifecycle: runtimeContext.restartLifecycle,
    semanticSignals: runtimeContext.semanticSignals
  });

  if (shouldAutoRestartAfterReindex(server)) {
    queueRuntimeRestart(server, {
      filename,
      reason: `${policy.reason} (deferred until reindex settles)`,
      eventName: 'hot-reload:restart-pending'
    });
  }
}

function applyRuntimeReloadChange({ eventType, filename, moduleInfo, reloadHandler }) {
  logger.info(`♻️ Runtime change detected: ${filename} (${moduleInfo?.type || 'reloadable surface'}/${eventType})`);
  reloadHandler.applyModuleReload(filename, moduleInfo);
}

function shouldDeferChange(server) {
  return isServerIndexing(server) || isMutationBatchActive(server) || !!server?.orchestrator?.phase2Status?.inProgress;
}

function shouldAutoRestartAfterReindex(server) {
  const autoRestartAfterReindex = String(process.env.OMNYSYS_REINDEX_AUTO_RESTART || '').toLowerCase() === 'true';
  return autoRestartAfterReindex && server?.runtimeRestartMode === 'auto';
}

function isServerIndexing(server) {
  return !!server?.orchestrator?.isIndexing || !!server?.isIndexing;
}

function ensureDeferredChangeQueue(server) {
  if (!server._pendingHotReloadChanges) {
    server._pendingHotReloadChanges = new Map();
  }

  return server._pendingHotReloadChanges;
}

function queueDeferredChange(server, payload) {
  if (!server || !payload?.filename) {
    return;
  }

  const queue = ensureDeferredChangeQueue(server);
  queue.set(payload.filename, {
    eventType: payload.eventType,
    filename: payload.filename,
    server: payload.server,
    classifier: payload.classifier,
    reloadHandler: payload.reloadHandler,
    recoveryContext: payload.recoveryContext,
    queuedAt: Date.now()
  });

  scheduleDeferredDrain(server);
}

function scheduleDeferredDrain(server) {
  if (!server || server._hotReloadDeferredDrainTimer) {
    return;
  }

  server._hotReloadDeferredDrainTimer = setTimeout(() => {
    server._hotReloadDeferredDrainTimer = null;
    drainDeferredChanges(server);
  }, 1000);

  server._hotReloadDeferredDrainTimer?.unref?.();
}

function drainDeferredChanges(server) {
  const queue = server._pendingHotReloadChanges;
  if (!queue || queue.size === 0) {
    return;
  }

  if (shouldDeferChange(server) || server?.hotReloadManager?.reloadHandler?.isReloading) {
    if (server && !server._hotReloadDeferredDrainTimer) {
      server._hotReloadDeferredDrainTimer = setTimeout(() => {
        server._hotReloadDeferredDrainTimer = null;
        drainDeferredChanges(server);
      }, 1000);

      server._hotReloadDeferredDrainTimer?.unref?.();
    }
    return;
  }

  const queuedChanges = Array.from(queue.values());
  queue.clear();

  queuedChanges.sort((left, right) => {
    const priority = getChangePriority(right.filename) - getChangePriority(left.filename);
    return priority !== 0 ? priority : left.queuedAt - right.queuedAt;
  });

  for (const change of queuedChanges) {
    processReloadableChange({
      ...change,
      server
    });
  }
}

function getChangePriority(filename) {
  const normalized = String(filename || '').replace(/\\/g, '/');
  if (/(^|[\\/])layer-c-memory[\\/]mcp[\\/].*\.js$/i.test(normalized)) return 4;
  if (/(^|[\\/])shared[\\/]compiler[\\/].*\.js$/i.test(normalized)) return 3;
  if (/(^|[\\/])layer-a-static[\\/].*\.js$/i.test(normalized)) return 2;
  return 1;
}

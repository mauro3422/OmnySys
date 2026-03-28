/**
 * @fileoverview File Change Watcher Manager
 *
 * Detects changes to source files and notifies the orchestrator to re-index
 * affected atoms in SQLite.
 *
 * ⚠️ IMPORTANT — Runtime code changes still need a fresh ESM cache.
 * In proxy mode, runtime-facing modules now request a controlled worker
 * restart automatically. In standalone mode the watcher still falls back to
 * a manual restart notice.
 *
 * FUTURE: User-defined plugin tools (outside the main module graph)
 * could be hot-loaded via isolated dynamic imports.
 *
 * @module hot-reload-manager
 * @version 2.1.0
 */

import { createLogger } from '../../../utils/logger.js';
import { FileWatcher } from './watchers/file-watcher.js';
import { ModuleClassifier } from './watchers/module-classifier.js';
import { ReloadHandler } from './handlers/reload-handler.js';
import { classifyRuntimeChange, RuntimeChangeAction } from './policy/runtime-change-policy.js';
import { queueRuntimeRestart } from './restart-coordinator.js';
import { isMutationBatchActive } from '../shared/mutation-batch.js';

const logger = createLogger('OmnySys:hot-reload');

/**
 * Manager de Hot-Reload para el servidor MCP
 * 
 * Características:
 * - Monitorea cambios en el código del sistema
 * - Recarga módulos sin perder estado
 * - Preserva cache, colas y datos del orquestador
 * - Re-registra tools en el servidor MCP
 * 
 * @class HotReloadManager
 */
export class HotReloadManager {
  /**
   * Creates a hot-reload manager
   * @param {Object} server - MCP server instance
   */
  constructor(server) {
    this.server = server;
    this.classifier = new ModuleClassifier();
    this.reloadHandler = new ReloadHandler(server);
    this.fileWatcher = null;
  }

  /**
   * Starts the hot-reload manager
   * @returns {Promise<void>}
   */
  async start() {
    if (this.fileWatcher?.isWatching()) {
      logger.warn('Hot-reload already started');
      return;
    }

    logger.info('Starting hot-reload manager...');
    this.fileWatcher = createManagedFileWatcher(this.server, (eventType, filename) => this._handleFileChange(eventType, filename));
    await this.fileWatcher.start();

    logger.info('Monitoring tools, extractors, handlers, and queries');
  }

  /**
   * Stops the hot-reload manager
   */
  stop() {
    if (this.fileWatcher) {
      this.fileWatcher.stop();
      this.fileWatcher = null;
      if (this.server) {
        this.server._pendingHotReloadChanges?.clear?.();
        if (this.server._hotReloadDeferredDrainTimer) {
          clearTimeout(this.server._hotReloadDeferredDrainTimer);
          this.server._hotReloadDeferredDrainTimer = null;
        }
      }
      logger.info('Hot-reload stopped');
    }
  }

  /**
   * Handles file change events
   * @private
   * @param {string} eventType - Type of change
   * @param {string} filename - Changed file
   */
  _handleFileChange(eventType, filename) {
    handleReloadableChange({
      eventType,
      filename,
      server: this.server,
      classifier: this.classifier,
      reloadHandler: this.reloadHandler
    });
  }

  /**
   * Gets hot-reload statistics
   * @returns {Object}
   */
  getHotReloadStats() {
    const status = this.reloadHandler.getStatus();
    const watcherStats = snapshotWatcherStats(this.fileWatcher);

    return {
      isWatching: this.fileWatcher?.isWatching() || false,
      isReloading: status.isReloading,
      runtimeRestartMode: this.server?.runtimeRestartMode || 'manual',
      pendingRuntimeRestart: {
        scheduled: !!this.server?._hotReloadRestartScheduled,
        files: Array.from(this.server?._pendingHotReloadRestartFiles || [])
      },
      pendingDeferredChanges: {
        scheduled: !!this.server?._hotReloadDeferredDrainTimer,
        files: Array.from(this.server?._pendingHotReloadChanges?.keys?.() || [])
      },
      criticalModules: this.classifier.getCriticalModules().length,
      reloadablePatterns: this.classifier.getPatterns().length,
      watcherNoise: {
        startupNoiseSuppressed: watcherStats.startupNoiseSuppressed || 0,
        startupSuppressionWindowMs: watcherStats.startupSuppressionWindowMs || 0
      }
    };
  }
}

// Export all components for advanced usage
export {
  FileWatcher,
  ModuleClassifier,
  ReloadHandler
};

export default HotReloadManager;

function createManagedFileWatcher(server, onChange) {
  return new FileWatcher({
    projectPath: server.projectPath,
    onChange,
    debounceMs: 500
  });
}

function handleReloadableChange({ eventType, filename, server, classifier, reloadHandler }) {
  if (shouldDeferChange(server)) {
    queueDeferredChange(server, { eventType, filename, server, classifier, reloadHandler });
    logger.debug(`Deferring hot-reload while indexing/mutating: ${filename}`);
    return;
  }

  processReloadableChange({ eventType, filename, server, classifier, reloadHandler });
}

function processReloadableChange({ eventType, filename, server, classifier, reloadHandler }) {
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
  if (policy.action === RuntimeChangeAction.IGNORE) {
    logger.debug(`Ignoring non-runtime file: ${filename}`);
    return;
  }

  if (policy.action === RuntimeChangeAction.REFRESH) {
    logger.info(`♻️ Refresh-worthy change detected: ${filename} (${moduleInfo?.type || policy.reason}/${eventType})`);
    server.emit('hot-reload:refresh-requested', {
      file: filename,
      reason: policy.reason,
      action: policy.action
    });
    reloadHandler.applyModuleReload(filename, moduleInfo);
    return;
  }

  if (policy.action === RuntimeChangeAction.RESTART) {
    logger.warn(`🚨 Runtime restart required: ${filename} (${policy.reason})`);
    queueRuntimeRestart(server, {
      filename,
      reason: policy.reason,
      eventName: 'hot-reload:restart-pending'
    });
    return;
  }

  if (policy.action === RuntimeChangeAction.REINDEX) {
    logger.info(`♻️ Reindex-worthy change detected: ${filename} (${moduleInfo?.type || policy.reason}/${eventType})`);
    server.emit('hot-reload:reindex-requested', {
      file: filename,
      reason: policy.reason,
      action: policy.action,
      runtimeReloadDeferred: true,
      runtimeRestartMode: server?.runtimeRestartMode || 'manual'
    });

    if (server?.runtimeRestartMode === 'auto') {
      queueRuntimeRestart(server, {
        filename,
        reason: `${policy.reason} (deferred until reindex settles)`,
        eventName: 'hot-reload:restart-pending'
      });
    }
    return;
  }

  logger.info(`♻️ Runtime change detected: ${filename} (${moduleInfo?.type || policy.reason}/${eventType})`);
  reloadHandler.applyModuleReload(filename, moduleInfo);
}

function shouldDeferChange(server) {
  return isServerIndexing(server) || isMutationBatchActive(server);
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
    classifier: payload.classifier,
    reloadHandler: payload.reloadHandler,
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
    scheduleDeferredDrain(server);
    return;
  }

  const queuedChanges = Array.from(queue.values());
  queue.clear();

  queuedChanges.sort((left, right) => {
    const priority = getChangePriority(right.filename) - getChangePriority(left.filename);
    return priority !== 0 ? priority : left.queuedAt - right.queuedAt;
  });

  for (const change of queuedChanges) {
    processReloadableChange(change);
  }
}

function getChangePriority(filename) {
  const normalized = String(filename || '').replace(/\\/g, '/');
  if (/(^|[\\/])layer-c-memory[\\/]mcp[\\/].*\.js$/i.test(normalized)) return 4;
  if (/(^|[\\/])shared[\\/]compiler[\\/].*\.js$/i.test(normalized)) return 3;
  if (/(^|[\\/])layer-a-static[\\/].*\.js$/i.test(normalized)) return 2;
  return 1;
}

function snapshotWatcherStats(fileWatcher) {
  return fileWatcher?.getFileWatcherStats?.() || {};
}


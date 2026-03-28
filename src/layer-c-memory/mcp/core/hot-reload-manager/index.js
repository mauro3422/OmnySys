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
  if (reloadHandler.isReloading) {
    logger.debug(`Ignoring change during reload: ${filename}`);
    return;
  }

  if (server.isIndexing) {
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

function snapshotWatcherStats(fileWatcher) {
  return fileWatcher?.getFileWatcherStats?.() || {};
}


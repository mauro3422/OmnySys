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
import { FileWatcher } from './watchers/file-watcher/file-watcher.js';
import { ModuleClassifier } from './watchers/module-classifier.js';
import { ReloadHandler } from './handlers/reload-handler.js';
import {
  createManagedFileWatcher,
  handleReloadableChange,
  snapshotWatcherStats
} from './change-flow.js';
import { buildRestartLifecycleGuidance } from '../../../../shared/compiler/index.js';

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
    handleReloadableChange({ eventType, filename, server: this.server, classifier: this.classifier, reloadHandler: this.reloadHandler });
  }

  /**
   * Gets hot-reload statistics
   * @returns {Object}
   */
  getHotReloadStats() {
    const status = this.reloadHandler.getStatus();
    const watcherStats = snapshotWatcherStats(this.fileWatcher);
    const proxyManaged = process.env.OMNYSYS_PROXY_MODE === '1' || typeof process.send === 'function';

    return {
      isWatching: this.fileWatcher?.isWatching() || false,
      isReloading: status.isReloading,
      runtimeRestartMode: this.server?.runtimeRestartMode || 'manual',
      restartLifecycle: buildRestartLifecycleGuidance({
        restartType: 'hot_reload_runtime_restart',
        proxyMode: proxyManaged
      }),
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


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
  getStats() {
    const status = this.reloadHandler.getStatus();
    const watcherStats = getWatcherStatsSnapshot(this.fileWatcher);

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

  const moduleInfo = classifier.classify(filename);
  if (!moduleInfo) {
    logger.debug(`Ignoring non-reloadable file: ${filename}`);
    return;
  }

  if (moduleInfo.type === 'critical') {
    logger.warn(`🚨 Live compiler critical change: ${filename}`);
    logger.warn('   Manual restart required for changes to take effect');
    server.emit('hot-reload:critical-change', { file: filename });
    return;
  }

  logger.info(`♻️ Runtime change detected: ${filename} (${moduleInfo.type}/${eventType})`);
  reloadHandler.reload(filename, moduleInfo);
}

function getWatcherStatsSnapshot(fileWatcher) {
  return fileWatcher?.getStats?.() || {};
}


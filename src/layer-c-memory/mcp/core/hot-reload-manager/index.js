/**
 * @fileoverview Hot Reload Manager - Modular Architecture
 * 
 * Hot-Reload system for OmnySys MCP Server.
 * Allows the server to update automatically when its code changes.
 * 
 * @module hot-reload-manager
 * @version 2.0.0
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

    this.fileWatcher = new FileWatcher({
      projectPath: this.server.projectPath,
      onChange: (eventType, filename) => this._handleFileChange(eventType, filename),
      debounceMs: 500
    });

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
    if (this.reloadHandler.isReloading) {
      logger.debug(`Ignoring change during reload: ${filename}`);
      return;
    }

    // Classify the module
    const moduleInfo = this.classifier.classify(filename);

    if (!moduleInfo) {
      logger.debug(`Ignoring non-reloadable file: ${filename}`);
      return;
    }

    // Handle critical modules
    if (moduleInfo.type === 'critical') {
      logger.warn(`Critical module changed: ${filename}`);
      logger.warn('   Manual restart required for changes to take effect');
      this.server.emit('hot-reload:critical-change', { file: filename });
      return;
    }

    logger.info(`Detected change: ${filename} (${eventType})`);

    // Execute reload
    this.reloadHandler.reload(filename, moduleInfo);
  }

  /**
   * Gets hot-reload statistics
   * @returns {Object}
   */
  getStats() {
    const status = this.reloadHandler.getStatus();

    return {
      isWatching: this.fileWatcher?.isWatching() || false,
      isReloading: status.isReloading,
      criticalModules: this.classifier.getCriticalModules().length,
      reloadablePatterns: this.classifier.getPatterns().length
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

/**
 * @fileoverview Base Reload Strategy
 * 
 * Abstract base class for module reload strategies.
 * Defines the contract that all strategies must implement.
 * 
 * @module hot-reload-manager/strategies/base-strategy
 */

import path from 'path';
import { pathToFileURL } from 'url';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:hot-reload:strategy');
const RUNTIME_RESTART_DEBOUNCE_MS = 900;

/**
 * Abstract base class for reload strategies
 * 
 * @abstract
 * @class BaseStrategy
 */
export class BaseStrategy {
  /**
   * Creates a base strategy
   * @param {Object} server - MCP server instance
   */
  constructor(server) {
    if (new.target === BaseStrategy) {
      throw new TypeError('Cannot instantiate abstract class');
    }
    this.server = server;
  }

  /**
   * Reloads a module
   * @abstract
   * @param {string} filename - File to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    throw new Error('reload() must be implemented by subclass');
  }

  /**
   * Resolves full path for a module
   * @protected
   * @param {string} filename - Relative filename
   * @returns {string} Absolute path
   */
  _resolvePath(filename) {
    return path.resolve(this.server.projectPath, filename);
  }

  /**
   * Generates unique import URL for cache busting
   * @protected
   * @param {string} modulePath - Module path
   * @param {string} [prefix='reload'] - Query parameter prefix
   * @returns {string} Unique import URL
   */
  _generateUniqueImport(modulePath, prefix = 'reload') {
    // En Windows, path.resolve() devuelve C:\... que no es válido para ESM import().
    // Hay que convertir a file:///C:/... usando pathToFileURL.
    const fileUrl = pathToFileURL(modulePath).href;
    return `${fileUrl}?${prefix}=${Date.now()}`;
  }

  /**
   * Invalidates Node.js require cache
   * @protected
   * @param {string} moduleId - Module ID to invalidate
   */
  _invalidateCache(moduleId) {
    if (require.cache && require.cache[moduleId]) {
      delete require.cache[moduleId];
      logger.debug(`Invalidated require.cache for: ${moduleId}`);
    }
  }

  /**
   * Logs reload action
   * @protected
   * @param {string} action - Action description
   * @param {string} filename - File being processed
   */
  _log(action, filename) {
    logger.debug(`${action}: ${filename}`);
  }

  /**
   * Returns true when the worker runs under the HTTP proxy and can request a
   * fresh child process without dropping the parent listener.
   *
   * @protected
   * @returns {boolean}
   */
  _isProxyManaged() {
    return process.env.OMNYSYS_PROXY_MODE === '1' && typeof process.send === 'function';
  }

  /**
   * Returns the runtime restart mode for hot-reload runtime-facing changes.
   *
   * `manual`: queue pending restart files but do not restart automatically.
   * `auto`: current behavior, request a proxy-managed worker restart.
   *
   * @protected
   * @returns {'manual'|'auto'}
   */
  _getRuntimeRestartMode() {
    return this.server?.runtimeRestartMode === 'auto' ? 'auto' : 'manual';
  }

  /**
   * Queues a runtime restart without executing it automatically.
   *
   * @protected
   * @param {string} filename
   * @param {string} reason
   * @returns {boolean}
   */
  _queueManualRuntimeRestart(filename, reason) {
    if (!this.server._pendingHotReloadRestartFiles) {
      this.server._pendingHotReloadRestartFiles = new Set();
    }

    this.server._pendingHotReloadRestartFiles.add(filename);
    logger.warn(
      `${reason} changed - queued manual runtime restart: ${Array.from(this.server._pendingHotReloadRestartFiles).join(', ')}`
    );

    this.server.emit?.('hot-reload:restart-pending', {
      file: filename,
      files: Array.from(this.server._pendingHotReloadRestartFiles),
      reason: 'manual_runtime_restart_required'
    });

    return true;
  }

  /**
   * Requests a proxy-managed worker restart so runtime code changes are applied
   * with a fresh ESM cache. Returns false when running standalone.
   *
   * @protected
   * @param {string} filename
   * @param {string} reason
   * @returns {boolean}
   */
  _requestWorkerRestart(filename, reason) {
    if (this._getRuntimeRestartMode() !== 'auto') {
      return this._queueManualRuntimeRestart(filename, reason);
    }

    if (!this._isProxyManaged()) {
      return false;
    }

    if (!this.server._pendingHotReloadRestartFiles) {
      this.server._pendingHotReloadRestartFiles = new Set();
    }
    this.server._pendingHotReloadRestartFiles.add(filename);

    if (this.server._hotReloadRestartTimer) {
      clearTimeout(this.server._hotReloadRestartTimer);
    }

    if (this.server._hotReloadRestartScheduled) {
      this._log('Worker restart already scheduled', filename);
      return true;
    }

    try {
      this.server._hotReloadRestartTimer = setTimeout(() => {
        const touchedFiles = Array.from(this.server._pendingHotReloadRestartFiles || []);
        this.server._pendingHotReloadRestartFiles?.clear();
        this.server._hotReloadRestartTimer = null;
        this.server._hotReloadRestartScheduled = true;

        logger.warn(
          `${reason} changed - requesting worker restart for fresh runtime cache: ${touchedFiles.join(', ')}`
        );

        process.send({
          type: 'restart',
          clearCache: false,
          reanalyze: false,
          clearCacheOnly: false,
          reindexOnly: false,
          reason: 'hot_reload_runtime_change',
          file: filename,
          files: touchedFiles
        });
      }, RUNTIME_RESTART_DEBOUNCE_MS);

      if (this.server._hotReloadRestartTimer?.unref) {
        this.server._hotReloadRestartTimer.unref();
      }
      return true;
    } catch (error) {
      if (this.server._hotReloadRestartTimer) {
        clearTimeout(this.server._hotReloadRestartTimer);
        this.server._hotReloadRestartTimer = null;
      }
      this.server._pendingHotReloadRestartFiles?.clear();
      this.server._hotReloadRestartScheduled = false;
      logger.warn(`Failed to request worker restart for ${filename}: ${error.message}`);
      return false;
    }
  }
}

export default BaseStrategy;

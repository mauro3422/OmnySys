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
import { execFileSync } from 'child_process';
import { createLogger } from '../../../../utils/logger.js';
import { queueRuntimeRestart } from '../restart-coordinator.js';

const logger = createLogger('OmnySys:hot-reload:strategy');

function hasRealGitChange(projectPath, filename) {
  try {
    const output = execFileSync(
      'git',
      ['status', '--porcelain', '--untracked-files=no', '--', filename],
      { cwd: projectPath, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return String(output || '').trim().length > 0;
  } catch {
    // If git is unavailable, prefer safety and keep current behavior.
    return true;
  }
}

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
   * Applies a reload action for a module
   * @param {string} filename - File to reload
   * @returns {Promise<void>}
   */
  async applyReload(filename) {
    if (typeof this._applyReload !== 'function') {
      throw new Error('_applyReload() must be implemented by subclass');
    }

    return this._applyReload(filename);
  }

  /**
   * Internal reload implementation used by subclasses.
   *
   * @abstract
   * @protected
   * @param {string} filename
   * @returns {Promise<void>}
   */
  async _applyReload() {
    throw new Error('_applyReload() must be implemented by subclass');
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
   * Queues a runtime restart without executing it automatically.
   *
   * @protected
   * @param {string} filename
   * @param {string} reason
   * @returns {boolean}
   */
  _queueManualRuntimeRestart(filename, reason) {
    if (!hasRealGitChange(this.server?.projectPath, filename)) {
      logger.info(`${reason} change ignored (no real git diff): ${filename}`);
      return false;
    }

    return queueRuntimeRestart(this.server, {
      filename,
      reason,
      eventName: 'hot-reload:restart-pending'
    });
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
    return queueRuntimeRestart(this.server, {
      filename,
      reason,
      eventName: 'hot-reload:restart-pending'
    });
  }
}

export default BaseStrategy;

/**
 * @fileoverview Base Reload Strategy
 * 
 * Abstract base class for module reload strategies.
 * Defines the contract that all strategies must implement.
 * 
 * @module hot-reload-manager/strategies/base-strategy
 */

import path from 'path';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:hot-reload:strategy');

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
    return `${modulePath}?${prefix}=${Date.now()}`;
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
}

export default BaseStrategy;

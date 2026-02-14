/**
 * @fileoverview Reload Handler
 * 
 * Coordinates the hot-reload process including state preservation,
 * module reloading, and state restoration.
 * 
 * @module hot-reload-manager/handlers/reload-handler
 */

import { createLogger } from '../../../../utils/logger.js';
import { StateHandler } from './state-handler.js';
import { ToolStrategy } from '../strategies/tool-strategy.js';
import { ExtractorStrategy } from '../strategies/extractor-strategy.js';
import { HandlerStrategy } from '../strategies/handler-strategy.js';
import { QueryStrategy } from '../strategies/query-strategy.js';
import { LifecycleStrategy } from '../strategies/lifecycle-strategy.js';
import { PipelineStrategy } from '../strategies/pipeline-strategy.js';

const logger = createLogger('OmnySys:hot-reload:handler');

/**
 * Handles the hot-reload process
 * 
 * @class ReloadHandler
 */
export class ReloadHandler {
  /**
   * Creates a reload handler
   * @param {Object} server - MCP server instance
   */
  constructor(server) {
    this.server = server;
    this.stateHandler = new StateHandler(server);
    this.isReloading = false;

    // Initialize strategies
    this.strategies = {
      tool: new ToolStrategy(server),
      extractor: new ExtractorStrategy(server),
      handler: new HandlerStrategy(server),
      query: new QueryStrategy(server),
      lifecycle: new LifecycleStrategy(server),
      pipeline: new PipelineStrategy(server)
    };
  }

  /**
   * Executes hot-reload for a module
   * 
   * @param {string} filename - File being reloaded
   * @param {Object} moduleInfo - Module classification info
   * @returns {Promise<Object>} Reload result
   */
  async reload(filename, moduleInfo) {
    if (this.isReloading) {
      return { success: false, error: 'Already reloading' };
    }

    this.isReloading = true;
    const startTime = Date.now();

    try {
      logger.info(`Hot-reloading: ${filename}`);

      // 1. Preserve state
      this.stateHandler.preserve();

      // 2. Execute reload strategy
      await this._executeStrategy(filename, moduleInfo);

      // 3. Restore state
      this.stateHandler.restore();

      const duration = Date.now() - startTime;
      logger.info(`Hot-reload complete: ${filename} (${duration}ms)`);

      this._emitSuccess(filename, moduleInfo, duration);

      return { success: true, duration };

    } catch (error) {
      logger.error(`Hot-reload failed: ${filename}`, error);
      this._handleError(filename, error);
      return { success: false, error: error.message };

    } finally {
      this.isReloading = false;
      this.stateHandler.clear();
    }
  }

  /**
   * Executes the appropriate reload strategy
   * @private
   * @param {string} filename - File being reloaded
   * @param {Object} moduleInfo - Module classification
   */
  async _executeStrategy(filename, moduleInfo) {
    const strategy = this.strategies[moduleInfo.type];

    if (!strategy) {
      logger.warn(`No strategy for module type: ${moduleInfo.type}`);
      return;
    }

    await strategy.reload(filename);
  }

  /**
   * Handles reload errors
   * @private
   * @param {string} filename - File that failed
   * @param {Error} error - Error that occurred
   */
  _handleError(filename, error) {
    this.server.emit('hot-reload:error', { 
      file: filename, 
      error: error.message 
    });

    // Try to restore state even on failure
    try {
      this.stateHandler.restore();
    } catch (restoreError) {
      logger.error('Failed to restore state:', restoreError);
    }
  }

  /**
   * Emits success event
   * @private
   * @param {string} filename - File that was reloaded
   * @param {Object} moduleInfo - Module info
   * @param {number} duration - Reload duration
   */
  _emitSuccess(filename, moduleInfo, duration) {
    this.server.emit('hot-reload:completed', {
      file: filename,
      type: moduleInfo.type,
      duration
    });
  }

  /**
   * Gets current reload status
   * @returns {Object}
   */
  getStatus() {
    return {
      isReloading: this.isReloading,
      hasPreservedState: this.stateHandler.hasPreservedState()
    };
  }
}

export default ReloadHandler;

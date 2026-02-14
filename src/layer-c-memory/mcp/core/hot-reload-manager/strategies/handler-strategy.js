/**
 * @fileoverview Handler Reload Strategy
 * 
 * Handles hot-reload of handlers.
 * Handlers reload automatically on next event.
 * 
 * @module hot-reload-manager/strategies/handler-strategy
 */

import { BaseStrategy } from './base-strategy.js';

/**
 * Strategy for reloading handlers
 * 
 * @class HandlerStrategy
 * @extends BaseStrategy
 */
export class HandlerStrategy extends BaseStrategy {
  /**
   * Reloads a handler module
   * 
   * @param {string} filename - Handler file to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    // Handlers reload automatically on next event
    this._log('Handler queued for reload (will apply on next event)', filename);
  }
}

export default HandlerStrategy;

/**
 * @fileoverview Handler Reload Strategy
 *
 * Handler modules sit inside the live MCP execution path. In proxy mode we
 * request a fresh worker so nested handler code is not served from stale ESM
 * cache. Standalone mode still requires a manual restart.
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
   * Reloads a handler module.
   *
   * @param {string} filename - Handler file to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    if (!this._requestWorkerRestart(filename, 'Handler module')) {
      this._log('Handler changed - restart task to apply (8s)', filename);
    }
  }
}

export default HandlerStrategy;

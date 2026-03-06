/**
 * @fileoverview Tool Reload Strategy
 *
 * Tool modules affect the live MCP runtime. In proxy mode we prefer a
 * controlled worker restart so the next request gets a fresh ESM cache.
 * Standalone mode still requires a manual restart.
 *
 * @module hot-reload-manager/strategies/tool-strategy
 */

import { BaseStrategy } from './base-strategy.js';

/**
 * Strategy for tool file changes
 *
 * @class ToolStrategy
 * @extends BaseStrategy
 */
export class ToolStrategy extends BaseStrategy {
  /**
   * Handles a tool file change.
   *
   * @param {string} filename - Changed tool file
   * @returns {Promise<void>}
   */
  async reload(filename) {
    if (!this._requestWorkerRestart(filename, 'Tool module')) {
      this._log('Tool changed - restart task to apply (8s)', filename);
    }
  }
}

export default ToolStrategy;

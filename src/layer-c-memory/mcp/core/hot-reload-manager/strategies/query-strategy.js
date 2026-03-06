/**
 * @fileoverview Query Reload Strategy
 *
 * Query modules are part of the live MCP runtime. In proxy mode we prefer a
 * short controlled worker restart over serving stale query logic from ESM
 * cache. Standalone mode still requires a manual restart.
 *
 * @module hot-reload-manager/strategies/query-strategy
 */

import { BaseStrategy } from './base-strategy.js';

/**
 * Strategy for reloading queries
 *
 * @class QueryStrategy
 * @extends BaseStrategy
 */
export class QueryStrategy extends BaseStrategy {
  /**
   * Reloads a query module.
   *
   * @param {string} filename - Query file to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    if (!this._requestWorkerRestart(filename, 'Query module')) {
      this._log('Query changed - restart task to apply (8s)', filename);
    }
  }
}

export default QueryStrategy;

/**
 * @fileoverview Query Reload Strategy
 * 
 * Handles hot-reload of query modules.
 * Queries reload automatically on next query.
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
   * Reloads a query module
   * 
   * @param {string} filename - Query file to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    // Queries reload automatically on next query
    this._log('Query queued for reload (will apply on next query)', filename);
  }
}

export default QueryStrategy;

/**
 * @fileoverview Extractor Reload Strategy
 * 
 * Handles hot-reload of extractors.
 * Extractors are used during analysis and reload
 * automatically on next analysis.
 * 
 * @module hot-reload-manager/strategies/extractor-strategy
 */

import { BaseStrategy } from './base-strategy.js';

/**
 * Strategy for reloading extractors
 * 
 * @class ExtractorStrategy
 * @extends BaseStrategy
 */
export class ExtractorStrategy extends BaseStrategy {
  /**
   * Reloads an extractor module
   * 
   * @param {string} filename - Extractor file to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    // Extractors are used during analysis
    // They will reload automatically on next analysis
    this._log('Extractor queued for reload (will apply on next analysis)', filename);
  }
}

export default ExtractorStrategy;

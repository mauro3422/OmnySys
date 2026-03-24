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
}

ExtractorStrategy.reloadPlan = {
  mode: 'log',
  message: 'Extractor queued for reload (will apply on next analysis)'
};

export default ExtractorStrategy;

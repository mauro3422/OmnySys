/**
 * @fileoverview Lifecycle Reload Strategy
 * 
 * Handles hot-reload of lifecycle modules.
 * Lifecycle methods require more complex reloading
 * as they are assigned to prototypes.
 * 
 * @module hot-reload-manager/strategies/lifecycle-strategy
 */

import { BaseStrategy } from './base-strategy.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:hot-reload:strategy:lifecycle');

/**
 * Strategy for reloading lifecycle modules
 * 
 * @class LifecycleStrategy
 * @extends BaseStrategy
 */
export class LifecycleStrategy extends BaseStrategy {
  /**
   * Reloads a lifecycle module
   * 
   * @param {string} filename - Lifecycle file to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    // Lifecycle methods are assigned to prototypes
    // Requires more complex reloading
    logger.warn(`Lifecycle reload partially supported: ${filename}`);
  }
}

export default LifecycleStrategy;

/**
 * @fileoverview Lifecycle Reload Strategy
 *
 * Lifecycle modules wire runtime behavior onto server instances. In proxy mode
 * we request a controlled worker restart so prototype-bound changes are applied
 * safely. Standalone mode still requires a manual restart.
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
   * Reloads a lifecycle module.
   *
   * @param {string} filename - Lifecycle file to reload
   * @returns {Promise<void>}
   */
  async reload(filename) {
    if (!this._requestWorkerRestart(filename, 'Lifecycle module')) {
      logger.warn(`Lifecycle reload requires manual restart in standalone mode: ${filename}`);
    }
  }
}

export default LifecycleStrategy;

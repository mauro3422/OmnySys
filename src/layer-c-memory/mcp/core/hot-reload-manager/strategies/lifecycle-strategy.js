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

/**
 * Strategy for reloading lifecycle modules
 *
 * @class LifecycleStrategy
 * @extends BaseStrategy
 */
export class LifecycleStrategy extends BaseStrategy {
}

LifecycleStrategy.reloadPlan = {
  mode: 'restart',
  restartReason: 'Lifecycle module',
  fallbackMessage: 'Lifecycle reload requires manual restart in standalone mode',
  fallbackLevel: 'warn'
};

export default LifecycleStrategy;

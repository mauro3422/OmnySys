/**
 * @fileoverview Pipeline Strategy
 *
 * Pipeline modules affect analysis and runtime metadata. In proxy mode we
 * request a controlled worker restart so the runtime sees a fresh ESM cache.
 * Standalone mode still requires a manual restart.
 *
 * @module hot-reload-manager/strategies/pipeline-strategy
 */

import { BaseStrategy } from './base-strategy.js';

/**
 * Strategy for pipeline file changes
 *
 * @class PipelineStrategy
 * @extends BaseStrategy
 */
export class PipelineStrategy extends BaseStrategy {
}

PipelineStrategy.reloadPlan = {
  mode: 'restart',
  restartReason: 'Pipeline module',
  fallbackMessage: 'Pipeline module changed - restart task to apply (8s)',
  fallbackLevel: 'debug'
};

export default PipelineStrategy;

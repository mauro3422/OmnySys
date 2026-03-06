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
  /**
   * Handles a pipeline file change.
   *
   * @param {string} filename - Changed pipeline file
   * @returns {Promise<void>}
   */
  async reload(filename) {
    if (!this._requestWorkerRestart(filename, 'Pipeline module')) {
      this._log('Pipeline module changed - restart task to apply (8s)', filename);
    }
  }
}

export default PipelineStrategy;

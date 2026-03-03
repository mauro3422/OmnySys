/**
 * @fileoverview Pipeline Strategy
 *
 * When a pipeline file changes, this strategy logs a notice and does nothing else.
 *
 * WHY NO MODULE RELOAD: Same reason as ToolStrategy — Node.js ESM cache.
 * See tool-strategy.js for full explanation.
 *
 * HOW TO APPLY CODE CHANGES:
 *   Restart the VS Code task "OmnySys MCP Daemon" (~8 seconds).
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
   * Handles a pipeline file change — logs a notice, no module reload.
   *
   * @param {string} filename - Changed pipeline file
   * @returns {Promise<void>}
   */
  async reload(filename) {
    this._log('Pipeline module changed — restart task to apply (8s)', filename);
  }
}

export default PipelineStrategy;

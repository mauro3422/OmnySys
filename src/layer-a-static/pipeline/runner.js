/**
 * @fileoverview PipelineRunner.js
 * 
 * Orchestrates the static analysis pipeline phases in a declarative way.
 * 
 * @module pipeline/runner
 */

import { startTimer } from '../../utils/performance-tracker.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:pipeline');

export class PipelineRunner {
  constructor(context = {}) {
    this.context = context;
    this.phases = [];
  }

  /**
   * Adds a phase to the pipeline.
   * @param {string} name - Phase name for logging/telemetry
   * @param {Function} task - Async function to execute
   * @returns {PipelineRunner}
   */
  addPhase(name, task) {
    this.phases.push({ name, task });
    return this;
  }

  /**
   * Executes all registered phases.
   * @param {boolean} verbose - Whether to show detailed output
   * @returns {Promise<Object>} Final context
   */
  async run(verbose = true) {
    const totalTimer = startTimer('TOTAL Pipeline');
    
    try {
      for (const { name, task } of this.phases) {
        const timer = startTimer(name);
        if (verbose) logger.info(`\n[Phase] ${name}...`);
        
        // Execute phase task with current context
        const result = await task(this.context, verbose);
        
        // Merge results into context if it's an object
        if (result && typeof result === 'object') {
          Object.assign(this.context, result);
        }
        
        timer.end(verbose);
      }
      
      const total = totalTimer.end(verbose);
      if (verbose) logger.info(`\n⚡ Pipeline completed in ${total.elapsed.toFixed(2)}ms`);
      
      return this.context;
    } catch (error) {
      logger.error('❌ Pipeline failed:', error);
      throw error;
    }
  }
}

/**
 * @fileoverview PipelineRunner.js
 *
 * Orchestrates the static analysis pipeline phases in a declarative way.
 *
 * @module pipeline/runner
 */

import { getRepository } from '#layer-c/storage/repository/index.js';
import { startTimer } from '../../utils/performance-tracker.js';
import { createLogger } from '../../utils/logger.js';
import { evaluatePipelineTimingTelemetry, persistPipelineTimingTelemetry } from '../../shared/compiler/pipeline-timing-telemetry.js';

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
    const phaseTimings = [];

    try {
      for (const { name, task } of this.phases) {
        const timer = startTimer(name);
        if (verbose) logger.info(`\n[Phase] ${name}...`);

        const result = await task(this.context, verbose);

        if (result && typeof result === 'object') {
          Object.assign(this.context, result);
        }

        const timing = timer.end(verbose);
        phaseTimings.push({
          name,
          elapsedMs: timing.elapsed,
          memoryDeltaMb: timing.memory?.heapUsed || 0,
          memory: timing.memory || null
        });
      }

      const total = totalTimer.end(verbose);
      const runKind = this.context.runKind || 'pipeline';
      const pipelineTiming = evaluatePipelineTimingTelemetry({
        projectPath: this.context.absoluteRootPath || this.context.projectPath || null,
        runKind,
        scopePath: this.context.scopePath || null,
        focusPath: this.context.focusPath || null,
        captureSource: this.context.captureSource || 'pipeline.run',
        startedAt: new Date(Date.now() - total.elapsed).toISOString(),
        endedAt: new Date().toISOString(),
        success: true,
        phaseTimings
      });

      this.context.pipelineTimings = phaseTimings;
      this.context.pipelineTiming = pipelineTiming;

      try {
        const projectPath = this.context.absoluteRootPath || this.context.projectPath || null;
        if (projectPath) {
          const repo = getRepository(projectPath);
          if (repo?.db) {
            persistPipelineTimingTelemetry(repo.db, pipelineTiming);
          }
        }
      } catch {
        // Advisory telemetry only.
      }

      if (verbose) logger.info(`\n⚡ Pipeline completed in ${total.elapsed.toFixed(2)}ms`);

      return this.context;
    } catch (error) {
      logger.error('❌ Pipeline failed:', error);
      throw error;
    }
  }
}

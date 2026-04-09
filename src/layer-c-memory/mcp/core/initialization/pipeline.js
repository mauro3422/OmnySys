import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:pipeline');


/**
 * @fileoverview pipeline.js
 *
 * Initialization Pipeline
 * Orchestrates server initialization steps
 *
 * @module mcp/core/initialization/pipeline
 */

/**
 * Initialization Pipeline
 * Manages the sequence of initialization steps with rollback support
 */
export class InitializationPipeline {
  /**
   * @param {Array<InitializationStep>} steps - Steps to execute
   */
  constructor(steps) {
    this.steps = steps;
    this.completedSteps = [];
  }

  /**
   * Execute all steps
   * @param {Object} server - Server instance
   * @returns {Promise<Object>} - Result { success, error, failedAt }
   */
  async execute(server) {
    const totalSteps = this.steps.filter(s => s.canExecute(server)).length;
    let currentStep = 0;
    const pipelineStartedAt = Date.now();
    server.initializationTimings = [];

    for (const step of this.steps) {
      // Check if should execute
      if (!step.canExecute(server)) {
        continue;
      }

      currentStep++;
      logger.info(`\n[${currentStep}/${totalSteps}] ${step.name}...`);
      const stepStartedAt = Date.now();
      server.currentInitializationStep = step.name;
      server.currentInitializationDetail = null;

      try {
        const shouldContinue = await step.execute(server);
        const stepEndedAt = Date.now();
        server.initializationTimings.push({
          name: step.name,
          startedAt: new Date(stepStartedAt).toISOString(),
          endedAt: new Date(stepEndedAt).toISOString(),
          elapsedMs: stepEndedAt - stepStartedAt
        });
        this.completedSteps.push(step);

        if (!shouldContinue) {
          logger.warn(`   ⚠️  Step ${step.name} requested halt`);
          return {
            success: false,
            haltedAt: step.name,
            completedSteps: this.completedSteps.length
          };
        }

        logger.info(`   ✅ ${step.name} complete`);
        server.currentInitializationStep = null;
        server.currentInitializationDetail = null;

      } catch (error) {
        logger.error(`   ❌ ${step.name} failed: ${error.message}`);
        server.currentInitializationStep = step.name;

        // Rollback
        await this.rollback(server, error);

        return {
          success: false,
          error,
          failedAt: step.name,
          completedSteps: this.completedSteps.length
        };
      }
    }

    server.initializationSummary = {
      startedAt: new Date(pipelineStartedAt).toISOString(),
      endedAt: new Date().toISOString(),
      elapsedMs: Date.now() - pipelineStartedAt,
      totalSteps,
      completedSteps: this.completedSteps.length,
      stepTimings: server.initializationTimings
    };

    return { 
      success: true, 
      completedSteps: this.completedSteps.length 
    };
  }

  /**
   * Rollback completed steps
   * @param {Object} server - Server instance
   * @param {Error} error - Error that caused rollback
   */
  async rollback(server, error) {
    logger.warn('\n🔄 Rolling back initialization...');

    for (const step of this.completedSteps.reverse()) {
      try {
        await step.rollback(server, error);
        logger.info(`   ✅ Rolled back: ${step.name}`);
      } catch (rollbackError) {
        logger.warn(`   ⚠️  Rollback failed for ${step.name}: ${rollbackError.message}`);
      }
    }
  }
}

export default InitializationPipeline;

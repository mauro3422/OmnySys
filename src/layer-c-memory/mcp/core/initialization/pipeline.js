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
    for (const step of this.steps) {
      // Check if should execute
      if (!step.shouldExecute(server)) {
        console.error(`⏭️  Skipping step: ${step.name}`);
        continue;
      }

      console.error(`\n⏳ Executing: ${step.name}`);

      try {
        const shouldContinue = await step.execute(server);
        this.completedSteps.push(step);

        if (!shouldContinue) {
          console.error(`   ⚠️  Step ${step.name} requested halt`);
          return { 
            success: false, 
            haltedAt: step.name,
            completedSteps: this.completedSteps.length 
          };
        }

        console.error(`   ✅ ${step.name} completed`);

      } catch (error) {
        console.error(`   ❌ ${step.name} failed: ${error.message}`);
        
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
    console.error('\n🔄 Rolling back initialization...');

    for (const step of this.completedSteps.reverse()) {
      try {
        await step.rollback(server, error);
        console.error(`   ✅ Rolled back: ${step.name}`);
      } catch (rollbackError) {
        console.error(`   ⚠️  Rollback failed for ${step.name}: ${rollbackError.message}`);
      }
    }
  }
}

export default InitializationPipeline;

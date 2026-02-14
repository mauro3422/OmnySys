/**
 * @fileoverview layer-a-analysis-step.js
 *
 * Step 1: Run Layer A static analysis if needed
 * 
 * Now runs BEFORE LLM setup so we can determine if LLM is actually needed.
 * This is the correct order: Layer A determines requirements, then we start LLM if needed.
 *
 * @module mcp/core/initialization/steps/layer-a-analysis-step
 */

import { InitializationStep } from './base-step.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:layer:a:analysis:step');



/**
 * Step 1: Layer A Analysis
 * Runs first to determine what analysis is needed before starting LLM.
 */
export class LayerAAnalysisStep extends InitializationStep {
  constructor() {
    super('layer-a-analysis', { blocking: true });
  }

  shouldExecute(server) {
    // LIGHT mode skips Layer A analysis — PRIMARY handles it
    return server.isPrimary !== false;
  }

  async execute(server) {
    logger.info('Layer A - Static Analysis');

    const { checkAndRunAnalysis } = await import('../../analysis-checker.js');
    const result = await checkAndRunAnalysis(server.projectPath);

    if (result.success) {
      logger.info(`  ✅ Analysis complete: ${result.fileCount} files, ${result.atomCount} atoms`);
    } else {
      logger.info('  ⚠️  Analysis warning:', result.error);
    }

    return true;
  }

  async rollback(server, error) {
    logger.info('  ℹ️  Layer A analysis is idempotent, no rollback needed');
  }
}

export default LayerAAnalysisStep;

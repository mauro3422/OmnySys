/**
 * @fileoverview layer-a-analysis-step.js
 *
 * Step 2: Run Layer A static analysis if needed
 *
 * @module mcp/core/initialization/steps/layer-a-analysis-step
 */

import { InitializationStep } from './base-step.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:layer:a:analysis:step');



/**
 * Step 2: Layer A Analysis
 */
export class LayerAAnalysisStep extends InitializationStep {
  constructor() {
    super('layer-a-analysis', { blocking: true });
  }

  async execute(server) {
    logger.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('STEP 2: Layer A - Static Analysis');
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { checkAndRunAnalysis } = await import('../analysis-checker.js');
    const result = await checkAndRunAnalysis(server.projectPath);

    if (result.success) {
      logger.error(`  ✅ Analysis complete: ${result.fileCount} files, ${result.atomCount} atoms`);
    } else {
      logger.error('  ⚠️  Analysis warning:', result.error);
    }

    return true;
  }

  async rollback(server, error) {
    logger.error('  ℹ️  Layer A analysis is idempotent, no rollback needed');
  }
}

export default LayerAAnalysisStep;

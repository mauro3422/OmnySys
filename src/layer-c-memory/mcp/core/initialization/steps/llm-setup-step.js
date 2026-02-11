/**
 * @fileoverview llm-setup-step.js
 *
 * Step 1: Initialize LLM server
 *
 * @module mcp/core/initialization/steps/llm-setup-step
 */

import { InitializationStep } from './base-step.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:setup:step');



/**
 * Step 1: LLM Server Setup
 */
export class LLMSetupStep extends InitializationStep {
  constructor() {
    super('llm-setup');
  }

  async execute(server) {
    logger.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.error('STEP 1: AI Server Setup');
    logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const { startLLM } = await import('../../llm-starter.js');
      await startLLM(server.OmnySysRoot);
      logger.error('  ✅ LLM server started');
      return true;
    } catch (error) {
      logger.error(`  ⚠️  LLM server not available: ${error.message}`);
      if (process.env.DEBUG) {
        logger.error(`  🐛 Error stack: ${error.stack}`);
      }
      return true; // Don't fail if LLM unavailable
    }
  }
}

export default LLMSetupStep;

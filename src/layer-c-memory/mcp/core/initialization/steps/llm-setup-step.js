/**
 * @fileoverview llm-setup-step.js
 *
 * Step 3: Initialize LLM server (BACKGROUND/NON-BLOCKING)
 * 
 * Starts LLM server in background BEFORE Orchestrator.
 * The Orchestrator will connect to it when ready (lazy connection).
 * This prevents blocking the pipeline while LLM initializes.
 *
 * @module mcp/core/initialization/steps/llm-setup-step
 */

import { InitializationStep } from './base-step.js';
import { createLogger } from '../../../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:setup:step');



/**
 * Step 3: LLM Server Setup
 * Starts LLM in background (non-blocking) before Orchestrator.
 * Orchestrator will connect lazily when LLM is ready.
 */
export class LLMSetupStep extends InitializationStep {
  constructor() {
    super('llm-setup');
  }

  shouldExecute(server) {
    // LIGHT mode skips LLM — PRIMARY handles it
    return server.isPrimary !== false;
  }

  async execute(server) {
    logger.info('AI Server Setup (Background)');

    try {
      const { startLLMBackground } = await import('../../llm-starter.js');
      
      // Start LLM in background (non-blocking)
      const started = await startLLMBackground(server.OmnySysRoot);
      
      if (started) {
        logger.info('  🚀 LLM server starting in background...');
        logger.info('     Will be ready in 10-30 seconds');
        logger.info('     Orchestrator will connect when ready');
      } else {
        logger.info('  ℹ️  LLM not started (already running or disabled)');
      }
      
      return true;
    } catch (error) {
      logger.info(`  ⚠️  LLM setup failed: ${error.message}`);
      if (process.env.DEBUG) {
        logger.info(`  🐛 Error stack: ${error.stack}`);
      }
      return true; // Don't fail if LLM unavailable
    }
  }
}

export default LLMSetupStep;

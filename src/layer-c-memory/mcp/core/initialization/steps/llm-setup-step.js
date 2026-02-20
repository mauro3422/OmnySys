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
    logger.info('AI Server Setup');
    // LLM desactivado — análisis derivado estáticamente desde átomos.
    // Reactivar cuando se identifiquen casos que genuinamente requieran LLM
    // (e.g., dynamic imports con variables, event names dinámicos).
    logger.info('  ℹ️  LLM desactivado — insights derivados de átomos (estático)');
    return true;
  }
}

export default LLMSetupStep;

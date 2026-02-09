/**
 * @fileoverview llm-setup-step.js
 *
 * Step 1: Initialize LLM server
 *
 * @module mcp/core/initialization/steps/llm-setup-step
 */

import { InitializationStep } from './base-step.js';

/**
 * Step 1: LLM Server Setup
 */
export class LLMSetupStep extends InitializationStep {
  constructor() {
    super('llm-setup');
  }

  async execute(server) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('STEP 1: AI Server Setup');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const { startLLM } = await import('../llm-starter.js');
      await startLLM(server.OmnySysRoot);
      console.error('  ✅ LLM server started');
      return true;
    } catch (error) {
      console.error('  ⚠️  LLM server not available, continuing without AI');
      return true; // Don't fail if LLM unavailable
    }
  }
}

export default LLMSetupStep;

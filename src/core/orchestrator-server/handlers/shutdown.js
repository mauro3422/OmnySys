/**
 * @fileoverview shutdown.js
 * 
 * Shutdown handlers
 * 
 * @module orchestrator-server/handlers/shutdown
 */

import { state } from '../server/state.js';

/**
 * Setup graceful shutdown handlers
 */
export function setupShutdownHandlers(logger) {
  process.on('SIGTERM', async () => {
    logger.info('\n👋 Shutting down orchestrator...');
    state.isRunning = false;
    if (state.worker) {
      await state.worker.stop();
    }
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('\n👋 Shutting down orchestrator...');
    state.isRunning = false;
    if (state.worker) {
      await state.worker.stop();
    }
    process.exit(0);
  });
}

/**
 * @fileoverview shutdown.js
 *
 * Shutdown handlers
 *
 * @module orchestrator-server/handlers/shutdown
 */

import { stopServerState } from '../server/state.js';

/**
 * Setup graceful shutdown handlers
 */
export function setupShutdownHandlers(logger) {
  const handleShutdown = async () => {
    logger.info('\nðŸ‘‹ Shutting down orchestrator...');
    await stopServerState();
    process.exit(0);
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

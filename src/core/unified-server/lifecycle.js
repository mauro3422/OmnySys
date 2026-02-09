import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:lifecycle');


﻿export async function shutdown() {
  logger.info('\nðŸ‘‹ Shutting down Unified Server...');

  this.isRunning = false;

  if (this.wsManager) {
    await this.wsManager.stop();
  }

  if (this.batchProcessor) {
    this.batchProcessor.stop();
  }

  if (this.fileWatcher) {
    await this.fileWatcher.stop();
  }

  if (this.worker) {
    await this.worker.stop();
  }

  if (this.orchestratorServer) {
    this.orchestratorServer.close();
  }

  if (this.bridgeServer) {
    this.bridgeServer.close();
  }

  logger.info('âœ… Server stopped');
  process.exit(0);
}

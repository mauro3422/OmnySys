import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:lifecycle');

/**
 * Stop the orchestrator
 */
export async function stop() {
  logger.info('\n👋 Stopping Orchestrator...');
  this.isRunning = false;

  if (this._llmHealthRunning) {
    this._llmHealthRunning = false;
    logger.info('✅ LLM health checker stopped');
  }

  if (this.fileWatcher) {
    await this.fileWatcher.stop();
  }

  if (this.batchProcessor) {
    this.batchProcessor.stop();
  }

  if (this.wsManager) {
    await this.wsManager.stop();
  }

  if (this.worker) {
    await this.worker.stop();
  }

  logger.info('✅ Orchestrator stopped');
}

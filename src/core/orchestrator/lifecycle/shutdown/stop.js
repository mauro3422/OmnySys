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

  const stopSteps = [
    { name: 'fileWatcher', stop: () => this.fileWatcher.stop() },
    { name: 'batchProcessor', stop: () => this.batchProcessor.stop() },
    { name: 'wsManager', stop: () => this.wsManager.stop() },
    { name: 'worker', stop: () => this.worker.stop() }
  ];

  for (const step of stopSteps) {
    if (!this[step.name]) continue;
    await step.stop();
  }

  logger.info('✅ Orchestrator stopped');
}

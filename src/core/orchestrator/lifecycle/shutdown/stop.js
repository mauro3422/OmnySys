import { createLogger } from '../../../../utils/logger.js';
import { shutdownTargets } from '../../../../shared/lifecycle/shutdown-helpers.js';

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

  const stopTargets = [
    { target: this.fileWatcher, methodName: 'stop' },
    { target: this.batchProcessor, methodName: 'stop' },
    { target: this.wsManager, methodName: 'stop' },
    { target: this.worker, methodName: 'stop' }
  ];

  await shutdownTargets(stopTargets);

  logger.info('✅ Orchestrator stopped');
}

import { createLogger } from '../../utils/logger.js';
import { closeIfPresent, stopIfPresent } from '../../shared/lifecycle/shutdown-helpers.js';

const logger = createLogger('OmnySys:lifecycle');

export async function shutdown() {
  logger.info('\nShutting down Unified Server...');

  this.isRunning = false;

  await stopIfPresent(this.wsManager);

  if (this.batchProcessor) {
    this.batchProcessor.stop();
  }

  await stopIfPresent(this.fileWatcher);
  await stopIfPresent(this.worker);
  await closeIfPresent(this.orchestratorServer);
  await closeIfPresent(this.bridgeServer);

  logger.info('Server stopped');
  process.exit(0);
}

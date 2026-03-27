import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:file-watcher:handlers');

export async function runFileHandlerWithBoundary(operationName, runner) {
  try {
    return await runner();
  } catch (error) {
    logger.error(`File handler failed in ${operationName}`, error);
    throw error;
  }
}

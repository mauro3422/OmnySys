import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:compiler:runtime-boundary');

export function withBoundaryLogging(fn, boundaryName) {
  return async function wrappedFunction(...args) {
    const startTime = Date.now();
    logger.debug(`[Boundary] Entering ${boundaryName}`);

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      logger.debug(`[Boundary] Exiting ${boundaryName} (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[Boundary] ${boundaryName} failed after ${duration}ms: ${error.message}`);
      throw error;
    }
  };
}

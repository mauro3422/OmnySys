import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:compiler:runtime-boundary');

export async function executeWithBoundary(operation, options = {}) {
  const {
    operationName = 'anonymous',
    boundaryType = 'runtime',
    shouldRecover = true,
    recoveryStrategy = null
  } = options;

  try {
    logger.debug(`[Boundary] Executing ${operationName} (${boundaryType})`);
    const result = await operation();
    return {
      success: true,
      data: result,
      boundaryType
    };
  } catch (error) {
    logger.warn(`[Boundary] ${operationName} failed: ${error.message}`);

    if (shouldRecover && recoveryStrategy) {
      try {
        const recoveredData = await recoveryStrategy(error);
        logger.info(`[Boundary] ${operationName} recovered successfully`);
        return {
          success: true,
          data: recoveredData,
          boundaryType,
          recovered: true
        };
      } catch (recoveryError) {
        logger.error(`[Boundary] ${operationName} recovery failed: ${recoveryError.message}`);
        return {
          success: false,
          error: recoveryError,
          boundaryType,
          recovered: false
        };
      }
    }

    return {
      success: false,
      error,
      boundaryType
    };
  }
}

export async function executeWithNetworkBoundary(networkOperation, options = {}) {
  const {
    timeoutMs = 5000,
    retries = 0,
    operationName = 'network-call'
  } = options;

  const operationWithTimeout = async () => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([networkOperation(), timeoutPromise]);
  };

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await executeWithBoundary(operationWithTimeout, {
      operationName: `${operationName}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`,
      boundaryType: 'network',
      shouldRecover: false
    });

    if (result.success) {
      return result;
    }

    lastError = result.error;
  }

  return {
    success: false,
    error: lastError,
    boundaryType: 'network'
  };
}

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

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

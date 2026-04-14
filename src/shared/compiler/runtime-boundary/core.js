/**
 * @fileoverview Runtime boundary execution core.
 *
 * Consolidated with async-boundary.js: re-exports runAsyncBoundary as the
 * canonical API while keeping executeWithBoundary for backward compatibility
 * with the single existing adopter.
 *
 * New code should prefer `runAsyncBoundary` from shared/compiler/index.js.
 */

import { runAsyncBoundary } from '../async-boundary.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:compiler:runtime-boundary');

/**
 * Execute an async operation with standardized boundary semantics.
 * Always returns {success, data/error} envelope (unlike runAsyncBoundary which throws).
 *
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Boundary options
 * @returns {Promise<{success: boolean, data?: *, error?: *, boundaryType?: string, recovered?: boolean}>}
 */
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
    return { success: true, data: result, boundaryType };
  } catch (error) {
    logger.warn(`[Boundary] ${operationName} failed: ${error.message}`);

    if (shouldRecover && recoveryStrategy) {
      try {
        const recoveredData = await recoveryStrategy(error);
        logger.info(`[Boundary] ${operationName} recovered successfully`);
        return { success: true, data: recoveredData, boundaryType, recovered: true };
      } catch (recoveryError) {
        logger.error(`[Boundary] ${operationName} recovery failed: ${recoveryError.message}`);
        return { success: false, error: recoveryError, boundaryType, recovered: false };
      }
    }

    return { success: false, error, boundaryType };
  }
}

// Re-export canonical API for gradual migration
export { runAsyncBoundary };

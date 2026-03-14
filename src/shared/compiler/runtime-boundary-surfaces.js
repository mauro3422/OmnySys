/**
 * @fileoverview Runtime Boundary Surfaces - Canonical API
 *
 * Provides canonical entrypoints for runtime boundary checks, async recovery,
 * and service boundary orchestration. Use these APIs instead of mixing
 * try/catch, network calls, and routing logic inline.
 *
 * @module shared/compiler/runtime-boundary-surfaces
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:compiler:runtime-boundary');

/**
 * Result of a runtime boundary check
 * @typedef {Object} RuntimeBoundaryResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {any} [data] - Result data if successful
 * @property {Error} [error] - Error if failed
 * @property {string} [boundaryType] - Type of boundary crossed (network, filesystem, etc.)
 * @property {boolean} [recovered] - Whether recovery was attempted
 */

/**
 * Executes an async operation with standardized error boundary handling.
 *
 * @param {Function} operation - Async operation to execute
 * @param {Object} options - Boundary options
 * @param {string} options.operationName - Name for logging/tracing
 * @param {string} [options.boundaryType='runtime'] - Type of boundary
 * @param {boolean} [options.shouldRecover=true] - Whether to attempt recovery
 * @param {Function} [options.recoveryStrategy] - Custom recovery function
 * @returns {Promise<RuntimeBoundaryResult>} Result with error handling
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

/**
 * Executes a network operation with standardized timeout and error handling.
 *
 * @param {Function} networkOperation - Async network operation
 * @param {Object} options - Network boundary options
 * @param {number} [options.timeoutMs=5000] - Timeout in milliseconds
 * @param {number} [options.retries=0] - Number of retry attempts
 * @param {string} [options.operationName='network-call'] - Operation name
 * @returns {Promise<RuntimeBoundaryResult>} Result with timeout/retry handling
 */
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

/**
 * Checks if an error is a boundary-related error (network, filesystem, etc.)
 *
 * @param {Error} error - Error to classify
 * @returns {{isBoundaryError: boolean, type?: string}} Error classification
 */
export function classifyBoundaryError(error) {
  if (!error) return { isBoundaryError: false };

  const message = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();

  // Network errors
  if (code === 'econnrefused' || code === 'enotfound' || code === 'etimedout' ||
      message.includes('network') || message.includes('timeout') ||
      message.includes('fetch failed')) {
    return { isBoundaryError: true, type: 'network' };
  }

  // Filesystem errors
  if (code.startsWith('e') && ['enoent', 'eaccess', 'eperm', 'eisdir', 'enotdir'].includes(code)) {
    return { isBoundaryError: true, type: 'filesystem' };
  }

  // Database errors
  if (code === 'sqlite_error' || message.includes('database') || message.includes('sql')) {
    return { isBoundaryError: true, type: 'database' };
  }

  return { isBoundaryError: false };
}

/**
 * Standard recovery strategies for common boundary errors.
 */
export const RecoveryStrategies = {
  /**
   * Retry with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {Object} options - Retry options
   */
  async retryWithBackoff(operation, options = {}) {
    const {
      maxRetries = 3,
      baseDelayMs = 100,
      maxDelayMs = 5000
    } = options;

    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        logger.debug(`[Recovery] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  },

  /**
   * Fallback to cached/default value
   * @param {any} fallbackValue - Value to return on failure
   */
  fallbackTo(fallbackValue) {
    return async function fallbackStrategy(error) {
      logger.info(`[Recovery] Using fallback value due to: ${error.message}`);
      return fallbackValue;
    };
  },

  /**
   * Return null/empty result on failure
   */
  async returnNull() {
    return null;
  },

  /**
   * Re-throw the error (no recovery)
   */
  async rethrow(error) {
    throw error;
  }
};

/**
 * Wraps a function to automatically log boundary crossings.
 *
 * @param {Function} fn - Function to wrap
 * @param {string} boundaryName - Name for logging
 * @returns {Function} Wrapped function with boundary logging
 */
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

/**
 * Metadata about runtime boundary surfaces for telemetry.
 */
export const RuntimeBoundaryMetadata = {
  version: '1.0.0',
  supportedBoundaryTypes: ['runtime', 'network', 'filesystem', 'database'],
  defaultTimeoutMs: 5000,
  defaultRetries: 0,
  recoveryStrategies: Object.keys(RecoveryStrategies)
};

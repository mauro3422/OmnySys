/**
 * @fileoverview Execution Wrapper
 * 
 * Wrap operations with protective strategies
 * 
 * @module error-guardian/guardian/execution/execution-wrapper
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:error:execution');

/**
 * Create execution wrapper
 * @param {Object} strategies - Strategy instances
 * @param {Object} options - Guardian options
 * @returns {Function} Execute function
 */
export function createExecutionWrapper(strategies, options) {
  const { retry, fallback, circuitBreaker } = strategies;

  return async function execute(operationId, operation, execOptions = {}) {
    const {
      useCircuitBreaker = options.enableCircuitBreaker,
      useRetry = options.enableRetry,
      useFallback = options.enableFallback,
      fallbackValue
    } = execOptions;

    let wrappedOperation = operation;

    // Wrap with retry
    if (useRetry) {
      wrappedOperation = wrapWithRetry(wrappedOperation, retry, operationId, execOptions.errorType);
    }

    // Wrap with fallback
    if (useFallback && fallbackValue !== undefined) {
      wrappedOperation = wrapWithFallback(wrappedOperation, fallbackValue, operationId);
    }

    // Wrap with circuit breaker
    if (useCircuitBreaker) {
      return circuitBreaker.execute(operationId, wrappedOperation);
    }

    return wrappedOperation();
  };
}

/**
 * Wrap operation with retry
 */
function wrapWithRetry(operation, retry, operationId, errorType) {
  const originalOp = operation;
  return async () => {
    return retry.execute(originalOp, { 
      operationId, 
      errorType: errorType || 'UNKNOWN'
    });
  };
}

/**
 * Wrap operation with fallback
 */
function wrapWithFallback(operation, fallbackValue, operationId) {
  const originalOp = operation;
  return async () => {
    try {
      return await originalOp();
    } catch (error) {
      logger.warn(`⚠️  Operation ${operationId} failed, using fallback`);
      return fallbackValue;
    }
  };
}
 

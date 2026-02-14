/**
 * @fileoverview Retry Manager
 * 
 * Manages retry logic for invalidation
 * 
 * @module cache-invalidator/operations/retry-manager
 */

import { InvalidationEvents } from '../constants.js';

/**
 * Create retry manager
 * @param {Object} deps - Dependencies
 * @returns {Object} Retry functions
 */
export function createRetryManager(deps) {
  const { config, emit, delay } = deps;

  return {
    /**
     * Execute with retry
     * @param {Function} operation - Operation to execute
     * @param {string} filePath - File path
     * @param {number} maxRetries - Max retries
     * @returns {Promise<Object>} Result
     */
    async executeWithRetry(operation, filePath, maxRetries = null) {
      const retries = maxRetries || config.maxRetries;

      for (let attempt = 1; attempt <= retries; attempt++) {
        const result = await operation();

        if (result.success) {
          return { ...result, attempts: attempt };
        }

        if (attempt < retries) {
          emit(InvalidationEvents.RETRYING, {
            filePath,
            attempt,
            maxRetries: retries,
            timestamp: Date.now()
          });

          await delay(config.retryDelayMs);
        }
      }

      return {
        success: false,
        filePath,
        attempts: retries,
        error: `Failed after ${retries} attempts`
      };
    }
  };
}

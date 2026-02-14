/**
 * @fileoverview retry-strategy.js
 * 
 * Strategy Pattern: Retry Strategy
 * 
 * Implements exponential backoff retry logic for transient failures.
 * Part of the Error Guardian modular architecture.
 * 
 * @module core/error-guardian/strategies/retry-strategy
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:error:retry');

/**
 * Configuration for retry behavior
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // ms
  maxDelay: 30000, // ms
  backoffMultiplier: 2,
  retryableErrors: [
    'TIMEOUT',
    'CACHE_ERROR',
    'NETWORK_ERROR',
    'EPIPE'
  ]
};

/**
 * Retry Strategy class implementing exponential backoff
 */
export class RetryStrategy {
  constructor(config = {}) {
    this.config = { ...RETRY_CONFIG, ...config };
    this.attempts = new Map(); // Track attempts per operation
  }

  /**
   * Check if an error type is retryable
   * @param {string} errorType - The error type to check
   * @returns {boolean}
   */
  isRetryable(errorType) {
    return this.config.retryableErrors.includes(errorType);
  }

  /**
   * Calculate delay for a given attempt using exponential backoff
   * @param {number} attempt - Current attempt number
   * @returns {number} - Delay in milliseconds
   */
  calculateDelay(attempt) {
    const delay = this.config.baseDelay * Math.pow(
      this.config.backoffMultiplier, 
      attempt - 1
    );
    return Math.min(delay, this.config.maxDelay);
  }

  /**
   * Execute a function with retry logic
   * @param {Function} operation - Async function to execute
   * @param {Object} options - Retry options
   * @param {string} options.operationId - Unique identifier for this operation
   * @param {string} options.errorType - Type of error for retryability check
   * @returns {Promise<*>} - Result of the operation
   */
  async execute(operation, options = {}) {
    const { operationId = 'default', errorType = 'UNKNOWN' } = options;
    
    if (!this.isRetryable(errorType)) {
      return operation();
    }

    const attempt = (this.attempts.get(operationId) || 0) + 1;
    this.attempts.set(operationId, attempt);

    try {
      const result = await operation();
      // Success - clear attempt counter
      this.attempts.delete(operationId);
      return result;
    } catch (error) {
      if (attempt >= this.config.maxRetries) {
        this.attempts.delete(operationId);
        throw error;
      }

      const delay = this.calculateDelay(attempt);
      logger.warn(`⚠️  Retry ${attempt}/${this.config.maxRetries} for ${operationId} after ${delay}ms`);
      
      await this.sleep(delay);
      return this.execute(operation, { ...options, operationId });
    }
  }

  /**
   * Sleep utility for delays
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current attempt count for an operation
   * @param {string} operationId - Operation identifier
   * @returns {number}
   */
  getAttemptCount(operationId) {
    return this.attempts.get(operationId) || 0;
  }

  /**
   * Clear attempt tracking
   * @param {string} operationId - Optional specific operation to clear
   */
  clearAttempts(operationId) {
    if (operationId) {
      this.attempts.delete(operationId);
    } else {
      this.attempts.clear();
    }
  }
}

export default RetryStrategy;

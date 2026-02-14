/**
 * @fileoverview base-provider.js
 * 
 * Base class for LLM providers.
 * Defines the interface that all providers must implement.
 * 
 * @module llm-service/providers/base-provider
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:provider:base');

/**
 * Circuit Breaker States
 */
export const CB_STATE = {
  CLOSED: 'CLOSED',      // Normal operation
  OPEN: 'OPEN',          // Failing, rejecting requests
  HALF_OPEN: 'HALF_OPEN' // Testing if recovered
};

/**
 * Base class for LLM providers
 * @abstract
 */
export class BaseProvider {
  constructor(config = {}) {
    if (new.target === BaseProvider) {
      throw new Error('BaseProvider is abstract. Use concrete implementations.');
    }

    this.config = config;
    this.name = 'base';
    
    // Circuit breaker
    this._cbState = CB_STATE.CLOSED;
    this._cbFailureCount = 0;
    this._cbSuccessCount = 0;
    this._cbThreshold = config.circuitBreakerThreshold || 5;
    this._cbResetTimeoutMs = config.circuitBreakerResetTimeoutMs || 30000;
    this._cbLastFailureTime = null;

    logger.debug(`BaseProvider initialized: ${this.name}`);
  }

  /**
   * Analyze a prompt using the LLM
   * @abstract
   * @param {string} prompt - The prompt to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<object>} Analysis result
   */
  async analyze(prompt, options = {}) {
    throw new Error('analyze() must be implemented by subclass');
  }

  /**
   * Perform a health check
   * @abstract
   * @returns {Promise<object>} Health status
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * Dispose of resources
   * @abstract
   * @returns {Promise<void>}
   */
  async dispose() {
    throw new Error('dispose() must be implemented by subclass');
  }

  /**
   * Check if circuit breaker allows requests
   * @returns {boolean}
   */
  isCircuitBreakerClosed() {
    if (this._cbState === CB_STATE.OPEN) {
      // Check if we should transition to half-open
      if (this._cbLastFailureTime && 
          Date.now() - this._cbLastFailureTime > this._cbResetTimeoutMs) {
        logger.info('🔧 Circuit breaker transitioning to HALF_OPEN');
        this._cbState = CB_STATE.HALF_OPEN;
        this._cbSuccessCount = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  /**
   * Record a successful request for circuit breaker
   */
  recordSuccess() {
    if (this._cbState === CB_STATE.HALF_OPEN) {
      this._cbSuccessCount++;
      if (this._cbSuccessCount >= 2) {
        logger.info('✅ Circuit breaker transitioning to CLOSED');
        this._cbState = CB_STATE.CLOSED;
        this._cbFailureCount = 0;
      }
    } else {
      this._cbFailureCount = Math.max(0, this._cbFailureCount - 1);
    }
  }

  /**
   * Record a failed request for circuit breaker
   * @returns {boolean} True if circuit breaker should open
   */
  recordFailure() {
    this._cbFailureCount++;
    this._cbLastFailureTime = Date.now();

    if (this._cbFailureCount >= this._cbThreshold) {
      logger.warn(`⚠️ Circuit breaker transitioning to OPEN (failures: ${this._cbFailureCount})`);
      this._cbState = CB_STATE.OPEN;
      return true;
    }
    return false;
  }

  /**
   * Get circuit breaker state
   * @returns {object}
   */
  getCircuitBreakerState() {
    return {
      state: this._cbState,
      failureCount: this._cbFailureCount,
      successCount: this._cbSuccessCount,
      lastFailureTime: this._cbLastFailureTime,
      threshold: this._cbThreshold,
      resetTimeoutMs: this._cbResetTimeoutMs
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  resetCircuitBreaker() {
    this._cbState = CB_STATE.CLOSED;
    this._cbFailureCount = 0;
    this._cbSuccessCount = 0;
    this._cbLastFailureTime = null;
  }
}

export default BaseProvider;

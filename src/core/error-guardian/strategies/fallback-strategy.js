/**
 * @fileoverview fallback-strategy.js
 * 
 * Strategy Pattern: Fallback Strategy
 * 
 * Provides fallback mechanisms when primary operations fail.
 * Supports multiple fallback levels and graceful degradation.
 * 
 * @module core/error-guardian/strategies/fallback-strategy
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:error:fallback');

/**
 * Fallback levels for graceful degradation
 */
export const FALLBACK_LEVELS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary',
  DEFAULT: 'default'
};

/**
 * Fallback Strategy for graceful degradation
 */
export class FallbackStrategy {
  constructor() {
    this.fallbacks = new Map();
    this.fallbackResults = new Map();
  }

  /**
   * Register a fallback chain for an operation
   * @param {string} operationId - Unique operation identifier
   * @param {Object} fallbackChain - Chain of fallback handlers
   * @param {Function} fallbackChain.primary - Primary operation
   * @param {Function} fallbackChain.secondary - Secondary fallback
   * @param {Function} [fallbackChain.tertiary] - Tertiary fallback
   * @param {*} [fallbackChain.defaultValue] - Default value if all fail
   */
  register(operationId, fallbackChain) {
    this.fallbacks.set(operationId, {
      primary: fallbackChain.primary,
      secondary: fallbackChain.secondary,
      tertiary: fallbackChain.tertiary,
      defaultValue: fallbackChain.defaultValue
    });
  }

  /**
   * Execute with fallback chain
   * @param {string} operationId - Operation to execute
   * @param {Array} args - Arguments to pass to operations
   * @returns {Promise<*>} - Result from primary or fallback
   */
  async execute(operationId, args = []) {
    const chain = this.fallbacks.get(operationId);
    
    if (!chain) {
      throw new Error(`No fallback chain registered for: ${operationId}`);
    }

    // Try primary
    try {
      const result = await chain.primary(...args);
      this.fallbackResults.set(operationId, { level: FALLBACK_LEVELS.PRIMARY, success: true });
      return result;
    } catch (primaryError) {
      logger.warn(`⚠️  Primary failed for ${operationId}, trying secondary...`);
    }

    // Try secondary
    try {
      const result = await chain.secondary(...args);
      this.fallbackResults.set(operationId, { level: FALLBACK_LEVELS.SECONDARY, success: true });
      logger.info(`✅ Fallback to secondary succeeded for ${operationId}`);
      return result;
    } catch (secondaryError) {
      logger.warn(`⚠️  Secondary failed for ${operationId}, trying tertiary...`);
    }

    // Try tertiary if available
    if (chain.tertiary) {
      try {
        const result = await chain.tertiary(...args);
        this.fallbackResults.set(operationId, { level: FALLBACK_LEVELS.TERTIARY, success: true });
        logger.info(`✅ Fallback to tertiary succeeded for ${operationId}`);
        return result;
      } catch (tertiaryError) {
        logger.warn(`⚠️  Tertiary failed for ${operationId}`);
      }
    }

    // Return default value if provided
    if (chain.defaultValue !== undefined) {
      this.fallbackResults.set(operationId, { level: FALLBACK_LEVELS.DEFAULT, success: true });
      logger.info(`✅ Using default value for ${operationId}`);
      return chain.defaultValue;
    }

    // All fallbacks exhausted
    throw new Error(`All fallbacks exhausted for operation: ${operationId}`);
  }

  /**
   * Create a memoized fallback that caches successful results
   * @param {string} operationId - Operation identifier
   * @param {Function} primary - Primary operation
   * @param {*} defaultValue - Default if primary fails
   * @returns {Function} - Memoized operation
   */
  createMemoized(operationId, primary, defaultValue) {
    let cached = null;
    let hasCache = false;

    return async (...args) => {
      if (hasCache) {
        return cached;
      }

      try {
        cached = await primary(...args);
        hasCache = true;
        return cached;
      } catch (error) {
        logger.warn(`⚠️  Primary failed for ${operationId}, using default`);
        return defaultValue;
      }
    };
  }

  /**
   * Get last fallback result info
   * @param {string} operationId - Operation identifier
   * @returns {Object|null}
   */
  getLastResult(operationId) {
    return this.fallbackResults.get(operationId) || null;
  }

  /**
   * Check if an operation has a registered fallback chain
   * @param {string} operationId - Operation identifier
   * @returns {boolean}
   */
  hasFallback(operationId) {
    return this.fallbacks.has(operationId);
  }

  /**
   * Unregister a fallback chain
   * @param {string} operationId - Operation identifier
   */
  unregister(operationId) {
    this.fallbacks.delete(operationId);
    this.fallbackResults.delete(operationId);
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.fallbacks.clear();
    this.fallbackResults.clear();
  }
}

export default FallbackStrategy;

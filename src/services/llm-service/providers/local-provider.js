/**
 * @fileoverview local-provider.js
 * 
 * Local LLM provider using the internal LLMClient.
 * Wraps the existing LLMClient for backward compatibility.
 * 
 * @module llm-service/providers/local-provider
 */

import { BaseProvider } from './base-provider.js';
import { LLMClient } from '../../../ai/llm/client.js';
import { loadAIConfig } from '../../../ai/llm/load-config.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:provider:local');

/**
 * Local LLM provider using internal LLMClient
 */
export class LocalProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'local';
    this.client = null;
    this._configLoaded = false;
  }

  /**
   * Initialize the provider
   */
  async initialize() {
    if (this.client) {
      return true;
    }

    try {
      const aiConfig = await loadAIConfig();
      this.config = { ...aiConfig, ...this.config };
      this.client = new LLMClient(this.config);
      this._configLoaded = true;
      logger.debug('LocalProvider initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize LocalProvider:', error.message);
      throw error;
    }
  }

  /**
   * Analyze a prompt using local LLM
   * @param {string} prompt - The prompt to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<object>} Analysis result
   */
  async analyze(prompt, options = {}) {
    // Check circuit breaker
    if (!this.isCircuitBreakerClosed()) {
      throw new Error('Circuit breaker is OPEN - Local LLM temporarily unavailable');
    }

    // Initialize if needed
    if (!this.client) {
      await this.initialize();
    }

    try {
      const result = await this.client.analyze(prompt, options);
      
      // Record success for circuit breaker
      this.recordSuccess();

      return {
        content: typeof result === 'string' ? result : JSON.stringify(result),
        provider: this.name,
        ...result
      };

    } catch (error) {
      // Record failure for circuit breaker
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Perform health check
   * @returns {Promise<object>} Health status
   */
  async healthCheck() {
    if (!this.client) {
      try {
        await this.initialize();
      } catch (error) {
        return {
          available: false,
          gpu: false,
          cpu: false,
          error: error.message,
          provider: this.name
        };
      }
    }

    try {
      const health = await this.client.healthCheck();
      const available = health.gpu || health.cpu;
      
      return {
        available,
        gpu: health.gpu || false,
        cpu: health.cpu || false,
        ...health,
        provider: this.name
      };
    } catch (error) {
      return {
        available: false,
        gpu: false,
        cpu: false,
        error: error.message,
        provider: this.name
      };
    }
  }

  /**
   * Dispose of resources
   */
  async dispose() {
    this.client = null;
    this._configLoaded = false;
    logger.debug('LocalProvider disposed');
  }
}

export default LocalProvider;

/**
 * @fileoverview openai-provider.js
 * 
 * OpenAI API provider implementation.
 * Supports OpenAI and OpenAI-compatible APIs.
 * 
 * @module llm-service/providers/openai-provider
 */

import { BaseProvider, CB_STATE } from './base-provider.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:provider:openai');

/**
 * OpenAI API provider
 */
export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'openai';
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-4';
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.timeout = config.timeout || 60000;

    if (!this.apiKey) {
      logger.warn('OpenAI API key not configured');
    }
  }

  /**
   * Analyze a prompt using OpenAI API
   * @param {string} prompt - The prompt to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<object>} Analysis result
   */
  async analyze(prompt, options = {}) {
    // Check circuit breaker
    if (!this.isCircuitBreakerClosed()) {
      throw new Error('Circuit breaker is OPEN - OpenAI service temporarily unavailable');
    }

    const model = options.model || this.model;
    const systemPrompt = options.systemPrompt || 'You are a helpful assistant.';
    const maxTokens = options.maxTokens || 2000;
    const temperature = options.temperature ?? 0.7;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this._makeRequest('/chat/completions', {
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false
        });

        // Record success for circuit breaker
        this.recordSuccess();

        return {
          content: response.choices[0]?.message?.content || '',
          model: response.model,
          usage: response.usage,
          provider: this.name,
          finishReason: response.choices[0]?.finish_reason
        };

      } catch (error) {
        lastError = error;
        logger.warn(`OpenAI request failed (attempt ${attempt + 1}/${this.maxRetries}):`, error.message);

        // Check if we should retry
        if (this._shouldRetry(error) && attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await this._sleep(delay);
          continue;
        }

        break;
      }
    }

    // Record failure for circuit breaker
    this.recordFailure();
    throw lastError;
  }

  /**
   * Perform health check
   * @returns {Promise<object>} Health status
   */
  async healthCheck() {
    try {
      // Try a minimal request to check if API is accessible
      const response = await this._makeRequest('/models', undefined, { timeout: 5000 });
      return {
        available: true,
        models: response.data?.length || 0,
        provider: this.name
      };
    } catch (error) {
      return {
        available: false,
        error: error.message,
        provider: this.name
      };
    }
  }

  /**
   * Dispose of resources
   */
  async dispose() {
    // Nothing to dispose for HTTP-based provider
    logger.debug('OpenAIProvider disposed');
  }

  /**
   * Make an API request
   * @private
   */
  async _makeRequest(endpoint, body, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const timeout = options.timeout || this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions = {
        method: body ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        );
        error.status = response.status;
        error.code = errorData.error?.code;
        throw error;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Check if error is retryable
   * @private
   */
  _shouldRetry(error) {
    // Retry on network errors and 5xx/429 status codes
    if (!error.status) return true;
    if (error.status >= 500) return true;
    if (error.status === 429) return true; // Rate limit
    return false;
  }

  /**
   * Sleep for a duration
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default OpenAIProvider;

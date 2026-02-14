/**
 * @fileoverview anthropic-provider.js
 * 
 * Anthropic Claude API provider implementation.
 * 
 * @module llm-service/providers/anthropic-provider
 */

import { BaseProvider } from './base-provider.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:provider:anthropic');

/**
 * Anthropic Claude API provider
 */
export class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'anthropic';
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    this.model = config.model || 'claude-3-sonnet-20240229';
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.timeout = config.timeout || 60000;
    this.apiVersion = config.apiVersion || '2023-06-01';

    if (!this.apiKey) {
      logger.warn('Anthropic API key not configured');
    }
  }

  /**
   * Analyze a prompt using Anthropic API
   * @param {string} prompt - The prompt to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<object>} Analysis result
   */
  async analyze(prompt, options = {}) {
    // Check circuit breaker
    if (!this.isCircuitBreakerClosed()) {
      throw new Error('Circuit breaker is OPEN - Anthropic service temporarily unavailable');
    }

    const model = options.model || this.model;
    const systemPrompt = options.systemPrompt;
    const maxTokens = options.maxTokens || 2000;
    const temperature = options.temperature ?? 0.7;

    const requestBody = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature
    };

    // Add system prompt if provided (Claude 3 supports this in the API)
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this._makeRequest('/messages', requestBody);

        // Record success for circuit breaker
        this.recordSuccess();

        return {
          content: response.content[0]?.text || '',
          model: response.model,
          usage: {
            prompt_tokens: response.usage?.input_tokens || 0,
            completion_tokens: response.usage?.output_tokens || 0,
            total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
          },
          provider: this.name,
          finishReason: response.stop_reason,
          stopSequence: response.stop_sequence
        };

      } catch (error) {
        lastError = error;
        logger.warn(`Anthropic request failed (attempt ${attempt + 1}/${this.maxRetries}):`, error.message);

        // Check if we should retry
        if (this._shouldRetry(error) && attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          
          // Check for rate limit retry-after header
          if (error.retryAfter) {
            await this._sleep(error.retryAfter * 1000);
          } else {
            await this._sleep(delay);
          }
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
      // Try to list models as a health check
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
    logger.debug('AnthropicProvider disposed');
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
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
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
        error.type = errorData.error?.type;
        
        // Check for rate limit
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          error.retryAfter = parseInt(retryAfter, 10);
        }
        
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
    // Retry on network errors and specific status codes
    if (!error.status) return true;
    if (error.status >= 500) return true;
    if (error.status === 429) return true; // Rate limit
    if (error.status === 529) return true; // Anthropic overloaded
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

export default AnthropicProvider;

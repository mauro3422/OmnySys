/**
 * @fileoverview request-handler.js
 * 
 * Handles LLM request preparation, validation, and processing.
 * 
 * @module llm-service/handlers/request-handler
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:request-handler');

/**
 * Request validation result
 */
export class ValidationResult {
  constructor(valid, errors = [], warnings = []) {
    this.valid = valid;
    this.errors = errors;
    this.warnings = warnings;
  }
}

/**
 * Handler for LLM requests
 */
export class RequestHandler {
  constructor(config = {}) {
    this.config = {
      maxPromptLength: config.maxPromptLength || 100000,
      defaultMaxTokens: config.defaultMaxTokens || 2000,
      defaultTemperature: config.defaultTemperature ?? 0.7,
      allowedModes: config.allowedModes || ['gpu', 'cpu', 'auto'],
      ...config
    };
  }

  /**
   * Validate a request
   * @param {string} prompt - The prompt to validate
   * @param {Object} options - Request options
   * @returns {ValidationResult}
   */
  validate(prompt, options = {}) {
    const errors = [];
    const warnings = [];

    // Validate prompt
    if (!prompt) {
      errors.push('Prompt is required');
    } else if (typeof prompt !== 'string') {
      errors.push('Prompt must be a string');
    } else if (prompt.length === 0) {
      errors.push('Prompt cannot be empty');
    } else if (prompt.length > this.config.maxPromptLength) {
      errors.push(`Prompt exceeds maximum length of ${this.config.maxPromptLength} characters`);
    }

    // Validate options
    if (options.mode && !this.config.allowedModes.includes(options.mode)) {
      errors.push(`Invalid mode: ${options.mode}. Allowed: ${this.config.allowedModes.join(', ')}`);
    }

    if (options.maxTokens !== undefined) {
      if (!Number.isInteger(options.maxTokens) || options.maxTokens <= 0) {
        errors.push('maxTokens must be a positive integer');
      } else if (options.maxTokens > 32000) {
        warnings.push('maxTokens exceeds recommended limit of 32000');
      }
    }

    if (options.temperature !== undefined) {
      if (typeof options.temperature !== 'number' || options.temperature < 0 || options.temperature > 2) {
        errors.push('temperature must be a number between 0 and 2');
      }
    }

    if (options.topP !== undefined) {
      if (typeof options.topP !== 'number' || options.topP < 0 || options.topP > 1) {
        errors.push('topP must be a number between 0 and 1');
      }
    }

    // Warn about potentially problematic prompts
    if (prompt && prompt.length < 10) {
      warnings.push('Prompt is very short, results may be unpredictable');
    }

    return new ValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Prepare a request for sending to the provider
   * @param {string} prompt - The prompt
   * @param {Object} options - Request options
   * @returns {Object} Prepared request
   */
  prepare(prompt, options = {}) {
    const validation = this.validate(prompt, options);
    
    if (!validation.valid) {
      throw new Error(`Invalid request: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      logger.warn('Request warnings:', validation.warnings);
    }

    // Apply defaults
    const preparedOptions = {
      mode: options.mode || 'auto',
      maxTokens: options.maxTokens || this.config.defaultMaxTokens,
      temperature: options.temperature ?? this.config.defaultTemperature,
      systemPrompt: options.systemPrompt,
      topP: options.topP,
      ...options
    };

    // Sanitize prompt
    const sanitizedPrompt = this._sanitizePrompt(prompt);

    return {
      prompt: sanitizedPrompt,
      options: preparedOptions,
      timestamp: Date.now(),
      requestId: this._generateRequestId()
    };
  }

  /**
   * Prepare a batch of requests
   * @param {Array<{prompt: string, options?: object}>} requests
   * @returns {Array<Object>}
   */
  prepareBatch(requests) {
    if (!Array.isArray(requests)) {
      throw new Error('Requests must be an array');
    }

    return requests.map((req, index) => {
      try {
        return this.prepare(req.prompt, req.options);
      } catch (error) {
        logger.error(`Failed to prepare request ${index}:`, error.message);
        return {
          error: error.message,
          index,
          timestamp: Date.now(),
          requestId: this._generateRequestId()
        };
      }
    });
  }

  /**
   * Sanitize a prompt
   * @private
   * @param {string} prompt
   * @returns {string}
   */
  _sanitizePrompt(prompt) {
    if (!prompt) return '';
    
    // Trim whitespace
    let sanitized = prompt.trim();
    
    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');
    
    // Normalize line endings
    sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    return sanitized;
  }

  /**
   * Generate a unique request ID
   * @private
   * @returns {string}
   */
  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estimate token count (rough approximation)
   * @param {string} text
   * @returns {number}
   */
  estimateTokens(text) {
    if (!text) return 0;
    
    // Very rough approximation: ~4 characters per token for English text
    // This is not accurate but useful for quick estimates
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if a prompt might exceed token limits
   * @param {string} prompt
   * @param {number} maxTokens
   * @returns {boolean}
   */
  mightExceedTokenLimit(prompt, maxTokens = 4096) {
    const estimatedTokens = this.estimateTokens(prompt);
    // Leave room for response
    return estimatedTokens > maxTokens * 0.75;
  }
}

export default RequestHandler;

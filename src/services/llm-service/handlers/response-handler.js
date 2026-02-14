/**
 * @fileoverview response-handler.js
 * 
 * Handles LLM response processing, validation, and formatting.
 * 
 * @module llm-service/handlers/response-handler
 */

import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:llm:response-handler');

/**
 * Response processing result
 */
export class ProcessedResponse {
  constructor(data, metadata = {}) {
    this.success = true;
    this.data = data;
    this.metadata = metadata;
    this.error = null;
  }

  static error(error, metadata = {}) {
    const result = new ProcessedResponse(null, metadata);
    result.success = false;
    result.error = error instanceof Error ? error : new Error(String(error));
    return result;
  }
}

/**
 * Handler for LLM responses
 */
export class ResponseHandler {
  constructor(config = {}) {
    this.config = {
      maxResponseLength: config.maxResponseLength || 500000,
      trimWhitespace: config.trimWhitespace ?? true,
      parseJSON: config.parseJSON ?? false,
      ...config
    };
  }

  /**
   * Process a raw response from the provider
   * @param {object} rawResponse - Raw response from provider
   * @param {Object} options - Processing options
   * @returns {ProcessedResponse}
   */
  process(rawResponse, options = {}) {
    const startTime = Date.now();
    const requestId = options.requestId;

    try {
      // Validate raw response
      if (!rawResponse) {
        throw new Error('Empty response received');
      }

      // Extract content based on provider format
      let content = this._extractContent(rawResponse);

      if (!content && content !== '') {
        throw new Error('Unable to extract content from response');
      }

      // Process content
      content = this._processContent(content, options);

      // Validate processed content
      this._validateContent(content);

      // Parse JSON if requested
      let parsedData = null;
      if (options.parseJSON || this.config.parseJSON) {
        parsedData = this._tryParseJSON(content);
      }

      const metadata = {
        requestId,
        processingTime: Date.now() - startTime,
        provider: rawResponse.provider,
        model: rawResponse.model,
        usage: rawResponse.usage,
        finishReason: rawResponse.finishReason,
        contentLength: content.length,
        isJSON: parsedData !== null
      };

      return new ProcessedResponse(
        parsedData || content,
        metadata
      );

    } catch (error) {
      logger.error('Response processing failed:', error.message);
      
      return ProcessedResponse.error(error, {
        requestId,
        processingTime: Date.now() - startTime,
        provider: rawResponse?.provider
      });
    }
  }

  /**
   * Process a batch of responses
   * @param {Array<object>} rawResponses
   * @param {Object} options
   * @returns {Array<ProcessedResponse>}
   */
  processBatch(rawResponses, options = {}) {
    if (!Array.isArray(rawResponses)) {
      return [ProcessedResponse.error(new Error('Responses must be an array'))];
    }

    return rawResponses.map((response, index) => {
      try {
        return this.process(response, { ...options, index });
      } catch (error) {
        return ProcessedResponse.error(error, { index });
      }
    });
  }

  /**
   * Format response for output
   * @param {ProcessedResponse} processedResponse
   * @param {string} format - Output format: 'json', 'text', 'object'
   * @returns {string|object}
   */
  format(processedResponse, format = 'object') {
    if (!processedResponse.success) {
      if (format === 'json') {
        return JSON.stringify({ error: processedResponse.error?.message });
      }
      return format === 'text' ? processedResponse.error?.message : processedResponse;
    }

    switch (format) {
      case 'json':
        return JSON.stringify(processedResponse.data);
      case 'text':
        return typeof processedResponse.data === 'string' 
          ? processedResponse.data 
          : JSON.stringify(processedResponse.data);
      case 'object':
      default:
        return processedResponse;
    }
  }

  /**
   * Extract content from raw response
   * @private
   * @param {object} rawResponse
   * @returns {string|null}
   */
  _extractContent(rawResponse) {
    // Handle different provider formats
    if (typeof rawResponse.content === 'string') {
      return rawResponse.content;
    }

    if (rawResponse.choices && rawResponse.choices[0]) {
      // OpenAI format
      return rawResponse.choices[0].message?.content ||
             rawResponse.choices[0].text;
    }

    if (rawResponse.content && Array.isArray(rawResponse.content)) {
      // Anthropic format
      return rawResponse.content[0]?.text;
    }

    if (typeof rawResponse === 'string') {
      return rawResponse;
    }

    return null;
  }

  /**
   * Process content
   * @private
   * @param {string} content
   * @param {Object} options
   * @returns {string}
   */
  _processContent(content, options) {
    // Trim whitespace if configured
    if (this.config.trimWhitespace) {
      content = content.trim();
    }

    // Remove common markdown code block wrappers if requested
    if (options.unwrapCodeBlocks) {
      content = this._unwrapCodeBlocks(content);
    }

    return content;
  }

  /**
   * Validate processed content
   * @private
   * @param {string} content
   */
  _validateContent(content) {
    if (content.length > this.config.maxResponseLength) {
      logger.warn(`Response exceeds max length: ${content.length} > ${this.config.maxResponseLength}`);
    }
  }

  /**
   * Try to parse content as JSON
   * @private
   * @param {string} content
   * @returns {object|null}
   */
  _tryParseJSON(content) {
    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonContent = codeBlockMatch ? codeBlockMatch[1].trim() : content.trim();

    try {
      return JSON.parse(jsonContent);
    } catch {
      return null;
    }
  }

  /**
   * Unwrap code blocks from content
   * @private
   * @param {string} content
   * @returns {string}
   */
  _unwrapCodeBlocks(content) {
    // Remove markdown code block syntax
    return content.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');
  }

  /**
   * Check if response indicates an error
   * @param {object} response
   * @returns {boolean}
   */
  isError(response) {
    if (!response) return true;
    if (response.error) return true;
    if (typeof response === 'object' && !response.success) return true;
    return false;
  }

  /**
   * Get error message from response
   * @param {object} response
   * @returns {string|null}
   */
  getErrorMessage(response) {
    if (!response) return 'Empty response';
    if (response.error) {
      return typeof response.error === 'string' 
        ? response.error 
        : response.error.message || 'Unknown error';
    }
    if (response.errorMessage) return response.errorMessage;
    return null;
  }
}

export default ResponseHandler;

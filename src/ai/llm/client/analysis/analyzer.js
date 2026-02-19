import { cleanLLMResponse, normalizeAnalysisResponse } from '../../response-cleaner.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:LLMClient');

/**
 * Analyzer - Single analysis method for LLM requests
 */
export class Analyzer {
  constructor(serverManager, promptBuilder) {
    this.serverManager = serverManager;
    this.promptBuilder = promptBuilder;
  }

  /**
   * Analyze code using LLM
   * @param {string} prompt - Prompt for LLM (user prompt)
   * @param {Object} options - Additional options
   * @param {string} options.mode - 'gpu' or 'cpu'
   * @param {string} options.systemPrompt - Custom system prompt (optional)
   * @returns {Promise<object>} - LLM response
   */
  async analyze(prompt, options = {}) {
    const { mode = 'gpu', systemPrompt = null } = options;

    const server = this.serverManager.selectServer(mode);
    if (!server) {
      throw new Error('No LLM server available');
    }

    this.serverManager.acquireServer(server);

    try {
      // Validate prompt is a valid string
      if (typeof prompt !== 'string') {
        throw new Error(`Invalid prompt type: ${typeof prompt}. Expected string.`);
      }

      const finalSystemPrompt = this.promptBuilder.getSystemPrompt(systemPrompt);
      const timeoutMs = this.promptBuilder.getTimeout();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        const serverUrl = this.serverManager.getServerUrl(server);
        logger.info(`📡 Sending request to ${serverUrl} (timeout: ${timeoutMs}ms)`);

        response = await fetch(`${serverUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'local-model',
            messages: [
              { role: 'system', content: finalSystemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 1000,
            stream: false
          }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`❌ LLM HTTP ERROR ${response.status}: ${errorText.slice(0, 500)}`);
        throw new Error(`LLM server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from LLM server');
      }

      logger.debug(`🤖 RAW LLM RESPONSE (length: ${content.length} chars):\n${content.slice(0, 1000)}`);

      // Try to parse as JSON (with markdown cleanup)
      return this._parseResponse(content);
    } finally {
      this.serverManager.releaseServer(server);
    }
  }

  /**
   * Parse and normalize LLM response
   * @private
   * @param {string} content - Raw response content
   * @returns {object} Parsed and normalized response
   */
  _parseResponse(content) {
    try {
      const cleanedContent = cleanLLMResponse(content);
      const parsed = JSON.parse(cleanedContent);
      const normalized = normalizeAnalysisResponse(parsed);

      // Preserve ALL LLM fields
      return {
        ...normalized,
        sharedState: normalized.sharedState || [],
        events: normalized.events || [],
        confidence: normalized.confidence || 0.5,
        reasoning: normalized.reasoning || 'No reasoning provided'
      };
    } catch (parseError) {
      // If not valid JSON, return default structure
      logger.warn('LLM response is not valid JSON:', content.slice(0, 200));
      return {
        sharedState: [],
        events: [],
        hiddenConnections: [],
        suggestedConnections: [],
        subsystemStatus: 'unknown',
        confidence: 0.0,
        reasoning: `Parse error: ${parseError.message}`
      };
    }
  }
}

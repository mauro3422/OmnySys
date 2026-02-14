/**
 * Prompt Builder - Constructs analysis prompts from code
 */
export class PromptBuilder {
  constructor(config) {
    this.config = config || {};
    this.prompts = this.config.prompts || {
      systemPrompt: "You are a semantic code analyzer. Return ONLY valid JSON.",
      analysisTemplate: ""
    };
    this.performance = this.config.performance || {};
  }

  /**
   * Get the system prompt (custom or default)
   * @param {string} customPrompt - Optional custom system prompt
   * @returns {string} System prompt
   */
  getSystemPrompt(customPrompt = null) {
    return customPrompt || 
           this.prompts?.systemPrompt || 
           "You are a semantic code analyzer. Return ONLY valid JSON.";
  }

  /**
   * Get timeout in milliseconds
   * @returns {number} Timeout in ms
   */
  getTimeout() {
    return this.performance?.timeout || 120000;
  }

  /**
   * Build analysis prompt from code
   * @param {string} code - Code to analyze
   * @param {string} filePath - File path
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(code, filePath) {
    return this.prompts.analysisTemplate
      .replace('{filePath}', filePath)
      .replace('{code}', code);
  }
}

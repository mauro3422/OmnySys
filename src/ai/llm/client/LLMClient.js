import { ServerManager } from './server/index.js';
import { PromptBuilder } from './prompts/index.js';
import { Analyzer, ParallelAnalyzer, BatchAnalyzer } from './analysis/index.js';

/**
 * LLMClient - Client for LLM servers
 * 
 * Main class that orchestrates server management, prompt building,
 * and analysis operations across GPU and CPU servers.
 */
export class LLMClient {
  constructor(config) {
    this.config = config || {};

    // Initialize sub-modules
    this.serverManager = new ServerManager(this.config);
    this.promptBuilder = new PromptBuilder(this.config);
    this.analyzer = new Analyzer(this.serverManager, this.promptBuilder);
    this.parallelAnalyzer = new ParallelAnalyzer(this.analyzer, this.serverManager);
    this.batchAnalyzer = new BatchAnalyzer(this.analyzer, this.serverManager);
  }

  /**
   * Check if servers are available
   * @returns {Promise<{gpu: boolean, cpu: boolean}>}
   */
  async healthCheck() {
    return this.serverManager.healthCheck();
  }

  /**
   * Select the best available server
   * @param {string} preferredMode - 'gpu' or 'cpu'
   * @returns {string|null} - 'gpu', 'cpu', or null if none available
   */
  selectServer(preferredMode = 'gpu') {
    return this.serverManager.selectServer(preferredMode);
  }

  /**
   * Analyze code using LLM
   * @param {string} prompt - Prompt for LLM
   * @param {Object} options - Additional options
   * @param {string} options.mode - 'gpu' or 'cpu'
   * @param {string} options.systemPrompt - Custom system prompt
   * @returns {Promise<object>} - LLM response
   */
  async analyze(prompt, options = {}) {
    return this.analyzer.analyze(prompt, options);
  }

  /**
   * Analyze multiple prompts in parallel using both servers
   * @param {string[]} prompts - Array of prompts
   * @returns {Promise<object[]>} - Array of responses
   */
  async analyzeParallel(prompts) {
    return this.parallelAnalyzer.analyzeParallel(prompts);
  }

  /**
   * Analyze multiple prompts with custom system prompts in parallel
   * @param {string[]} userPrompts - Array of user prompts
   * @param {string[]} systemPrompts - Array of system prompts
   * @returns {Promise<object[]>} - Array of responses
   */
  async analyzeParallelWithSystemPrompts(userPrompts, systemPrompts = []) {
    return this.parallelAnalyzer.analyzeParallelWithSystemPrompts(userPrompts, systemPrompts);
  }

  /**
   * Analyze multiple prompts with concurrency limit
   * @param {string[]} prompts - Array of prompts
   * @param {string} mode - 'gpu' or 'cpu'
   * @returns {Promise<object[]>} - Array of responses
   */
  async analyzeBatch(prompts, mode) {
    return this.batchAnalyzer.analyzeBatch(prompts, mode);
  }

  /**
   * Process batch with custom system prompts with concurrency limit
   * @param {string[]} userPrompts - Array of user prompts
   * @param {string[]} systemPrompts - Array of system prompts
   * @param {string} mode - 'gpu' or 'cpu'
   * @returns {Promise<object[]>} - Array of responses
   */
  async analyzeBatchWithPrompts(userPrompts, systemPrompts = [], mode) {
    return this.batchAnalyzer.analyzeBatchWithPrompts(userPrompts, systemPrompts, mode);
  }

  /**
   * Build analysis prompt from code
   * @param {string} code - Code to analyze
   * @param {string} filePath - File path
   * @returns {string} - Formatted prompt
   */
  buildAnalysisPrompt(code, filePath) {
    return this.promptBuilder.buildAnalysisPrompt(code, filePath);
  }
}

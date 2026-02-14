/**
 * Batch Analyzer - Handles batch processing with concurrency limits
 */
export class BatchAnalyzer {
  constructor(analyzer, serverManager) {
    this.analyzer = analyzer;
    this.serverManager = serverManager;
  }

  /**
   * Analyze multiple prompts with concurrency limit
   * @param {string[]} prompts - Array of prompts
   * @param {string} mode - 'gpu' or 'cpu'
   * @returns {Promise<object[]>} - Array of responses
   */
  async analyzeBatch(prompts, mode) {
    const results = [];
    const limit = this.serverManager.getMaxConcurrent();

    for (let i = 0; i < prompts.length; i += limit) {
      const batchPrompts = prompts.slice(i, i + limit);

      const batchResults = await Promise.all(
        batchPrompts.map((prompt, idx) => 
          this.analyzer.analyze(prompt, { mode }).catch(err => {
            console.error(`❌ LLM analyze error for prompt ${i + idx}:`, err.message);
            console.error(`Prompt preview: ${prompt.slice(0, 200)}...`);
            return { error: err.message };
          })
        )
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Process batch with custom system prompts with concurrency limit
   * @param {string[]} userPrompts - Array of user prompts
   * @param {string[]} systemPrompts - Array of system prompts
   * @param {string} mode - 'gpu' or 'cpu'
   * @returns {Promise<object[]>} - Array of responses
   */
  async analyzeBatchWithPrompts(userPrompts, systemPrompts = [], mode) {
    const results = [];
    const limit = this.serverManager.getMaxConcurrent();

    for (let i = 0; i < userPrompts.length; i += limit) {
      const batchUserPrompts = userPrompts.slice(i, i + limit);
      const batchSystemPrompts = systemPrompts.slice(i, i + limit);

      const batchResults = await Promise.all(
        batchUserPrompts.map((prompt, idx) => {
          const systemPrompt = batchSystemPrompts[idx] || null;
          return this.analyzer.analyze(prompt, { mode, systemPrompt }).catch(err => {
            console.error(`❌ LLM analyze error for prompt ${i + idx}:`, err.message);
            console.error(`Prompt preview: ${prompt.slice(0, 200)}...`);
            return { error: err.message };
          });
        })
      );
      results.push(...batchResults);
    }

    return results;
  }
}

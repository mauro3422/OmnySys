/**
 * Parallel Analyzer - Handles parallel analysis across GPU/CPU servers
 */
export class ParallelAnalyzer {
  constructor(analyzer, serverManager) {
    this.analyzer = analyzer;
    this.serverManager = serverManager;
  }

  /**
   * Analyze multiple prompts in parallel using both servers
   * @param {string[]} prompts - Array of prompts
   * @returns {Promise<object[]>} - Array of responses
   */
  async analyzeParallel(prompts) {
    if (!this.serverManager.isCPUFallbackEnabled()) {
      // Only GPU available, process sequentially with concurrency limit
      return this._analyzeBatch(prompts, 'gpu');
    }

    // Both servers available, distribute load
    const gpuPrompts = [];
    const cpuPrompts = [];

    // Distribute: GPU for even indices, CPU for odd
    prompts.forEach((prompt, index) => {
      if (index % 2 === 0) {
        gpuPrompts.push({ prompt, index });
      } else {
        cpuPrompts.push({ prompt, index });
      }
    });

    // Execute in parallel
    const [gpuResults, cpuResults] = await Promise.all([
      this._analyzeBatch(gpuPrompts.map(p => p.prompt), 'gpu'),
      this._analyzeBatch(cpuPrompts.map(p => p.prompt), 'cpu')
    ]);

    // Re-assemble in original order
    const results = new Array(prompts.length);
    gpuPrompts.forEach((p, i) => {
      results[p.index] = gpuResults[i];
    });
    cpuPrompts.forEach((p, i) => {
      results[p.index] = cpuResults[i];
    });

    return results;
  }

  /**
   * Analyze multiple prompts with custom system prompts in parallel
   * @param {string[]} userPrompts - Array of user prompts
   * @param {string[]} systemPrompts - Array of system prompts (same order as userPrompts)
   * @returns {Promise<object[]>} - Array of responses
   */
  async analyzeParallelWithSystemPrompts(userPrompts, systemPrompts = []) {
    if (!this.serverManager.isCPUFallbackEnabled()) {
      // Only GPU available, process sequentially with concurrency limit
      return this._analyzeBatchWithPrompts(userPrompts, systemPrompts, 'gpu');
    }

    // Both servers available, distribute load
    const gpuPrompts = [];
    const cpuPrompts = [];
    const gpuSystem = [];
    const cpuSystem = [];

    // Distribute: GPU for even indices, CPU for odd
    for (let i = 0; i < userPrompts.length; i++) {
      if (i % 2 === 0) {
        gpuPrompts.push(userPrompts[i]);
        gpuSystem.push(systemPrompts[i] || null);
      } else {
        cpuPrompts.push(userPrompts[i]);
        cpuSystem.push(systemPrompts[i] || null);
      }
    }

    // Execute in parallel
    const [gpuResults, cpuResults] = await Promise.all([
      this._analyzeBatchWithPrompts(gpuPrompts, gpuSystem, 'gpu'),
      this._analyzeBatchWithPrompts(cpuPrompts, cpuSystem, 'cpu')
    ]);

    // Re-assemble in original order
    const results = new Array(userPrompts.length);
    let gpuIndex = 0;
    let cpuIndex = 0;

    for (let i = 0; i < userPrompts.length; i++) {
      if (i % 2 === 0) {
        results[i] = gpuResults[gpuIndex++];
      } else {
        results[i] = cpuResults[cpuIndex++];
      }
    }

    return results;
  }

  /**
   * Analyze batch with concurrency limit (internal helper)
   * @private
   */
  async _analyzeBatch(prompts, mode) {
    const { BatchAnalyzer } = await import('./batch.js');
    const batchAnalyzer = new BatchAnalyzer(this.analyzer, this.serverManager);
    return batchAnalyzer.analyzeBatch(prompts, mode);
  }

  /**
   * Analyze batch with prompts (internal helper)
   * @private
   */
  async _analyzeBatchWithPrompts(userPrompts, systemPrompts, mode) {
    const { BatchAnalyzer } = await import('./batch.js');
    const batchAnalyzer = new BatchAnalyzer(this.analyzer, this.serverManager);
    return batchAnalyzer.analyzeBatchWithPrompts(userPrompts, systemPrompts, mode);
  }
}

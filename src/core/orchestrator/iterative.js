import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:iterative');

/**
 * Start iterative analysis when main queue is empty.
 * Only relevant when LLM is active — if no files have llmInsights the loop exits immediately.
 * Files with high-confidence suggestions get re-analyzed to refine connections.
 */
export async function _startIterativeAnalysis() {
  if (this.iteration >= this.maxIterations) {
    logger.debug(`Iterative analysis complete after ${this.iteration} iterations`);
    await this._finalizeAnalysis();
    return;
  }

  this.iteration++;
  logger.debug(`Starting iteration ${this.iteration}/${this.maxIterations}...`);

  try {
    const { getFileAnalysis } = await import('../../layer-c-memory/query/apis/file-api.js');
    const filesNeedingRefinement = [];

    // Check all analyzed files for high-confidence LLM suggestions
    for (const filePath of this.indexedFiles) {
      const analysis = await getFileAnalysis(this.projectPath, filePath);
      // LLM desactivado — iterative analysis no aplica sin llmInsights
      if (!analysis || !analysis.llmInsights) continue;

      const llmInsights = analysis.llmInsights;
      if (llmInsights.suggestedConnections?.length > 0) {
        const highConfidenceConnections = llmInsights.suggestedConnections
          .filter(conn => conn.confidence > 0.9);

        if (highConfidenceConnections.length > 0 && !analysis.llmInsights.iterationRefined) {
          filesNeedingRefinement.push({
            filePath,
            priority: 'high',
            needsLLM: true,
            isIterative: true,
            fileAnalysis: analysis
          });
        }
      }
    }

    if (filesNeedingRefinement.length === 0) {
      // No LLM insights — skip remaining iterations entirely
      logger.debug('No files need refinement (LLM inactive or no suggestions). Finalizing.');
      this.iteration = this.maxIterations; // prevent further iterations

      // Phase 2 safety: Don't finalize if background indexing is still running
      if (this.totalFilesToAnalyze > 0 && this.processedFiles.size < this.totalFilesToAnalyze) {
        logger.debug(`Background Phase 2 still running (${this.processedFiles.size}/${this.totalFilesToAnalyze}). Skipping early finalization.`);
        return;
      }

      await this._finalizeAnalysis();
      return;
    }

    logger.info(`📊 ${filesNeedingRefinement.length} files need LLM refinement`);

    // Add to iterative queue and process
    this.isIterating = true;
    this.iterativeQueue = filesNeedingRefinement;

    for (const file of filesNeedingRefinement) {
      this.queue.enqueueJob(file, file.priority);
    }

    this._processNext();
  } catch (error) {
    logger.error('❌ Error in iterative analysis:', error.message);
    this.isIterating = false;
  }
}

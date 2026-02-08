/**
 * Start iterative analysis when main queue is empty
 * Files with high-confidence suggestions get re-analyzed
 */
export async function _startIterativeAnalysis() {
  if (this.iteration >= this.maxIterations) {
    console.log(`\nâœ… Iterative analysis complete after ${this.iteration} iterations`);
    await this._finalizeAnalysis();
    return;
  }

  this.iteration++;
  console.log(`\nðŸ”„ Starting iteration ${this.iteration}/${this.maxIterations}...`);

  try {
    const { getFileAnalysis } = await import('../../layer-a-static/query/index.js');
    const filesNeedingRefinement = [];

    // Check all analyzed files for high-confidence suggestions
    for (const filePath of this.indexedFiles) {
      const analysis = await getFileAnalysis(this.projectPath, filePath);
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
      console.log('  âœ“ No files need refinement - consolidation complete');
      await this._finalizeAnalysis();
      return;
    }

    console.log(`  ðŸ“Š ${filesNeedingRefinement.length} files need refinement`);

    // Add to iterative queue and process
    this.isIterating = true;
    this.iterativeQueue = filesNeedingRefinement;

    for (const file of filesNeedingRefinement) {
      this.queue.enqueueJob(file, file.priority);
    }

    this._processNext();
  } catch (error) {
    console.error('  âŒ Error in iterative analysis:', error.message);
    this.isIterating = false;
  }
}

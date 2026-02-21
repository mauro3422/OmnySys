/**
 * LLM analysis utilities
 * @module mcp/core/analysis-checker/llm-analyzer
 */

/**
 * Cuenta archivos pendientes de analisis LLM
 * @param {string} projectPath - Project root path
 * @returns {Promise<number>} - Count of pending files
 */
export async function countPendingLLMAnalysis(projectPath) {
  try {
    const { getProjectMetadata } = await import('#layer-c/query/apis/project-api.js');
    const { getFileAnalysis } = await import('#layer-c/query/apis/file-api.js');

    const metadata = await getProjectMetadata(projectPath);

    let pendingCount = 0;
    const fileEntries = metadata?.fileIndex || metadata?.files || {};

    for (const filePath of Object.keys(fileEntries)) {
      const analysis = await getFileAnalysis(projectPath, filePath);

      if (!analysis?.llmInsights) {
        const needsLLM =
          analysis?.semanticAnalysis?.sharedState?.writes?.length > 0 ||
          analysis?.semanticAnalysis?.eventPatterns?.eventListeners?.length > 0 ||
          (analysis?.exports?.length > 0 && analysis?.dependents?.length === 0);

        if (needsLLM) pendingCount++;
      }
    }

    return pendingCount;
  } catch {
    return 0;
  }
}

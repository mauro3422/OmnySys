/**
 * LLM analysis utilities
 * @module mcp/core/analysis-checker/llm-analyzer
 */

/**
 * Cuenta archivos pendientes de analisis LLM usando un counter cacheado en SQLite.
 * Si el counter no existe, hace fallback al conteo lento por archivo.
 * @param {string} projectPath - Project root path
 * @returns {Promise<number>} - Count of pending files
 */
export async function countPendingLLMAnalysis(projectPath) {
  try {
    // Fast path: read cached counter from system_metadata
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    if (repo?.db) {
      try {
        const row = repo.db.prepare(
          "SELECT value FROM system_metadata WHERE key = 'llm_pending_count'"
        ).get();
        if (row) {
          return parseInt(row.value, 10) || 0;
        }
      } catch {
        // system_metadata may not exist yet, fall through
      }
    }

    // Slow path: iterate over files (only on first run or if cache is missing)
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

    // Cache the result for future fast startups
    if (repo?.db) {
      try {
        repo.db.prepare(
          "INSERT OR REPLACE INTO system_metadata (key, value) VALUES ('llm_pending_count', ?)"
        ).run(String(pendingCount));
      } catch {
        // Ignore cache write errors
      }
    }

    return pendingCount;
  } catch {
    return 0;
  }
}

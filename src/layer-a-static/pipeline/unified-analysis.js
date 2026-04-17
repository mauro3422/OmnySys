import { fileURLToPath } from 'url';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { getGitStats } from '../../utils/git-analyzer.js';
import { runUnifiedAnalysisPipeline } from './unified-analysis-helpers.js';

/**
 * High-performance incremental analysis.
 */
export async function analyzeProjectFilesUnified(files, absoluteRootPath, verbose, extractionDepth = 'structural', logPrefix = 'Unified Analysis') {
    const gitStats = await getGitStats(absoluteRootPath);
    const repo = getRepository(absoluteRootPath);
    const workerScriptPath = fileURLToPath(new URL('./worker-analysis/analysis.js', import.meta.url));

    return runUnifiedAnalysisPipeline({
        files,
        absoluteRootPath,
        verbose,
        extractionDepth,
        logPrefix,
        gitStats,
        repo,
        workerScriptPath
    });
}

import { persistAsyncSafetyIssues } from './async-safety-persistence.js';

export async function reportAsyncSafetyIssues({
    rootPath,
    filePath,
    issues,
    networkIssues,
    EventEmitterContext,
    verbose,
    logger
}) {
    await persistAsyncSafetyIssues(rootPath, filePath, issues, networkIssues);

    EventEmitterContext.emit('runtime:async-safety', {
        filePath,
        totalIssues: issues.length,
        high: issues.filter((issue) => issue.severity === 'high').length,
        networkIssues,
        sample: issues.slice(0, 3).map((issue) => issue.atomName)
    });

    if (verbose) {
        logger.warn(`[ASYNC-SAFETY] ${filePath}: ${issues.length} issue(s), showing top ${Math.min(issues.length, 3)}`);
    }
}

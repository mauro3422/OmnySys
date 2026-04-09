import { persistAsyncSafetyIssues } from './persistence.js';

export async function reportAsyncSafetyIssues({
    rootPath,
    filePath,
    issues,
    networkIssues,
    propagation,
    EventEmitterContext,
    verbose,
    logger
}) {
    const persistence = await persistAsyncSafetyIssues(rootPath, filePath, issues, networkIssues);
    const resolvedPropagation = propagation
        || persistence?.propagation
        || issues[0]?.context?.extraData?.propagation
        || null;

    EventEmitterContext.emit('runtime:async-safety', {
        filePath,
        totalIssues: issues.length,
        high: issues.filter((issue) => issue.severity === 'high').length,
        networkIssues,
        sample: issues.slice(0, 3).map((issue) => issue.atomName),
        propagation: resolvedPropagation
    });

    if (verbose) {
        logger.warn(`[ASYNC-SAFETY] ${filePath}: ${issues.length} issue(s), showing top ${Math.min(issues.length, 3)}`);
    }
}

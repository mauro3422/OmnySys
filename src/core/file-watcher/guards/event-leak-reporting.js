import { persistEventLeakIssues } from './event-leak-persistence.js';

export async function reportEventLeakIssues({
    rootPath,
    filePath,
    issues,
    EventEmitterContext,
    verbose,
    logger
}) {
    await persistEventLeakIssues(rootPath, filePath, issues);

    EventEmitterContext.emit('runtime:event-leak', {
        filePath,
        totalIssues: issues.length,
        high: issues.filter((issue) => issue.severity === 'high').length,
        medium: issues.filter((issue) => issue.severity === 'medium').length,
        low: issues.filter((issue) => issue.severity === 'low').length,
        issues: issues.map((issue) => ({
            atomName: issue.atomName,
            severity: issue.severity,
            listenerCount: issue.context.extraData?.listenerCount
        }))
    });

    if (verbose) {
        logger.warn(`[EVENT-LEAK] ${filePath}: ${issues.length} potential leak(s) detected`);
    }
}

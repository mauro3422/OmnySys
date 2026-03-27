export function reportRuntimeRegistryHealth({ filePath, issues, EventEmitterContext, verbose, logger }) {
    EventEmitterContext.emit('runtime:registry-health', {
        filePath,
        totalIssues: issues.length,
        checks: issues.map((issue) => ({
            check: issue.check,
            severity: issue.severity,
            message: issue.message
        }))
    });

    if (verbose) {
        logger.warn(`[RUNTIME-REGISTRY-HEALTH] ${filePath}: ${issues.length} issue(s) detected`);
    }
}

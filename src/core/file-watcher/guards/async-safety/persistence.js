import { clearWatcherIssue, persistWatcherIssue } from '../../watcher-issue-persistence.js';

export async function clearPersistedAsyncSafetyIssues(rootPath, filePath) {
    try {
        await clearWatcherIssue(rootPath, filePath, 'runtime_async_safety_high');
        await clearWatcherIssue(rootPath, filePath, 'runtime_async_safety_medium');
        await clearWatcherIssue(rootPath, filePath, 'runtime_async_safety_low');
        return { cleared: true };
    } catch (error) {
        return { cleared: false, error: error.message };
    }
}

export async function persistAsyncSafetyIssues(rootPath, filePath, issues, networkIssues) {
    try {
        const highIssues = issues.filter((issue) => issue.severity === 'high');
        const primaryIssue = highIssues[0] || issues[0];

        await persistWatcherIssue(
            rootPath,
            filePath,
            primaryIssue.issueType,
            primaryIssue.severity,
            `[${issues.length} async issue(s)] ${primaryIssue.message}`,
            {
                totalIssues: issues.length,
                networkIssues,
                issues: issues.map((issue) => ({
                    atomName: issue.atomName,
                    severity: issue.severity,
                    message: issue.message
                })),
                ...primaryIssue.context
            }
        );

        if (highIssues.length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'runtime_async_safety_high');
        }
        if (issues.filter((issue) => issue.severity === 'medium').length === 0) {
            await clearWatcherIssue(rootPath, filePath, 'runtime_async_safety_medium');
        }

        return { highIssues, primaryIssue };
    } catch (error) {
        return {
            highIssues: [],
            primaryIssue: null,
            error: error.message
        };
    }
}

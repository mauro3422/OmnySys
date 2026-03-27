import { clearWatcherIssue, persistWatcherIssue } from '../watcher-issue-persistence.js';

export async function clearPersistedPipelineHealthIssues(rootPath, filePath) {
    await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_high');
    await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_medium');
    await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_low');
}

export async function persistPipelineHealthIssues(rootPath, filePath, issues) {
    const highIssues = issues.filter((issue) => issue.severity === 'high');
    const mediumIssues = issues.filter((issue) => issue.severity === 'medium');

    for (const issue of [...highIssues, ...mediumIssues]) {
        await persistWatcherIssue(
            rootPath,
            filePath,
            issue.issueType,
            issue.severity,
            `[PIPELINE] ${issue.message}`,
            issue.context
        );
    }

    if (highIssues.length === 0) {
        await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_high');
    }
    if (mediumIssues.length === 0) {
        await clearWatcherIssue(rootPath, filePath, 'code_pipeline_health_medium');
    }

    return { highIssues, mediumIssues };
}

import { clearWatcherIssue, persistWatcherIssue } from '../../watcher-issue-persistence.js';

export async function clearPersistedEventLeakIssues(rootPath, filePath) {
    await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_high');
    await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_medium');
    await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_low');
}

export async function persistEventLeakIssues(rootPath, filePath, issues) {
    const highIssues = issues.filter((issue) => issue.severity === 'high');
    const mediumIssues = issues.filter((issue) => issue.severity === 'medium');

    for (const issue of [...highIssues, ...mediumIssues]) {
        await persistWatcherIssue(
            rootPath,
            filePath,
            issue.issueType,
            issue.severity,
            issue.message,
            issue.context
        );
    }

    if (highIssues.length === 0) {
        await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_high');
    }
    if (mediumIssues.length === 0) {
        await clearWatcherIssue(rootPath, filePath, 'runtime_event_leak_medium');
    }

    return { highIssues, mediumIssues };
}

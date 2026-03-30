import { clearWatcherIssue, persistWatcherIssue } from '../../watcher-issue-persistence.js';

export async function clearPersistedDeadCodeIssues(rootPath, filePath) {
    await clearWatcherIssue(rootPath, filePath, 'code_dead_code_medium');
    await clearWatcherIssue(rootPath, filePath, 'code_dead_code_low');
}

export async function persistDeadCodeIssues(rootPath, filePath, issues) {
    const mediumIssues = issues.filter((issue) => issue.severity === 'medium');
    const lowIssues = issues.filter((issue) => issue.severity === 'low');

    if (mediumIssues.length > 0) {
        await persistWatcherIssue(
            rootPath,
            filePath,
            'code_dead_code_medium',
            'medium',
            `[${mediumIssues.length} dead code function(s)] ${mediumIssues[0].message}`,
            { issues: mediumIssues.map((issue) => issue.context) }
        );
    } else {
        await clearWatcherIssue(rootPath, filePath, 'code_dead_code_medium');
    }

    if (lowIssues.length > 0) {
        await persistWatcherIssue(
            rootPath,
            filePath,
            'code_dead_code_low',
            'low',
            `[${lowIssues.length} small dead code function(s)]`,
            { issues: lowIssues.map((issue) => issue.context) }
        );
    } else {
        await clearWatcherIssue(rootPath, filePath, 'code_dead_code_low');
    }

    return { mediumIssues, lowIssues };
}

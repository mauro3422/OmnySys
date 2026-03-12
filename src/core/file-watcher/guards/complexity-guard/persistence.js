import { clearWatcherIssue, persistWatcherIssue } from '../../watcher-issue-persistence.js';

export async function clearComplexityIssues(rootPath, filePath) {
    try {
        await clearWatcherIssue(rootPath, filePath, 'code_complexity_high');
        await clearWatcherIssue(rootPath, filePath, 'code_complexity_medium');
    } catch (error) {
        throw new Error(`Failed to clear complexity watcher issues for ${filePath}: ${error.message}`);
    }
}

export async function persistComplexityIssues(rootPath, filePath, issues) {
    const highIssues = issues.filter((issue) => issue.severity === 'high');
    const mediumIssues = issues.filter((issue) => issue.severity === 'medium');

    try {
        if (highIssues.length > 0) {
            const primary = highIssues[0];
            await persistWatcherIssue(
                rootPath,
                filePath,
                primary.issueType,
                'high',
                `[${highIssues.length} HIGH complexity issues] ${primary.message}`,
                {
                    issues: highIssues.map((issue) => issue.context),
                    byType: countIssuesByMetric(highIssues)
                }
            );
        } else {
            await clearWatcherIssue(rootPath, filePath, 'code_complexity_high');
        }

        if (mediumIssues.length > 0) {
            const primary = mediumIssues[0];
            await persistWatcherIssue(
                rootPath,
                filePath,
                primary.issueType,
                'medium',
                `[${mediumIssues.length} MEDIUM complexity issues] ${primary.message}`,
                { issues: mediumIssues.map((issue) => issue.context) }
            );
        } else {
            await clearWatcherIssue(rootPath, filePath, 'code_complexity_medium');
        }
    } catch (error) {
        throw new Error(`Failed to persist complexity watcher issues for ${filePath}: ${error.message}`);
    }

    return { highIssues, mediumIssues };
}

function countIssuesByMetric(issues) {
    return issues.reduce((result, issue) => {
        const metricType = issue.metricType;
        result[metricType] = (result[metricType] || 0) + 1;
        return result;
    }, {});
}

import { clearWatcherIssue, persistWatcherIssue } from '../watcher-issue-persistence.js';

export async function clearPersistedHotspotIssues(rootPath, filePath) {
    await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_high');
    await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_medium');
}

export async function persistHotspotIssues(rootPath, filePath, payload) {
    if (payload.highIssues.length > 0) {
        await persistWatcherIssue(
            rootPath,
            filePath,
            'perf_hotspot_high',
            'high',
            `[${payload.highIssues.length} HOTSPOT(s)] ${payload.highIssues[0].message}`,
            {
                issues: payload.highIssues.map((issue) => issue.context),
                totalChangeFrequency: payload.totalChangeFrequency
            }
        );
    } else {
        await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_high');
    }

    if (payload.mediumIssues.length > 0) {
        await persistWatcherIssue(
            rootPath,
            filePath,
            'perf_hotspot_medium',
            'medium',
            `[${payload.mediumIssues.length} potential hotspot(s)]`,
            { issues: payload.mediumIssues.map((issue) => issue.context) }
        );
    } else {
        await clearWatcherIssue(rootPath, filePath, 'perf_hotspot_medium');
    }
}

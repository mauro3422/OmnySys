import {
    summarizeCompilerDiagnostics,
    summarizeWatcherAlerts,
    summarizeWatcherAlertLifecycle
} from '../../../../shared/compiler/index.js';
import { loadWatcherIssues } from '../../../../core/file-watcher/watcher-issue-persistence.js';

export async function handleWatcherAlerts(tool, db, options, filePath) {
    if (!db) {
        return tool.formatError('MISSING_DB', 'Repository database not initialized');
    }

    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const issueType = options.issueType || 'all';
    const lifecycle = options.lifecycle || 'all';
    const projectPath = tool?.projectPath || tool?.projectRoot || tool?.rootPath;
    const result = await loadWatcherIssues(projectPath, {
        limit,
        offset,
        filePath,
        issueType,
        lifecycle,
        pruneExpired: true
    });
    const alerts = result.alerts;
    const total = result.total;
    const watcherSummary = summarizeWatcherAlerts(alerts);
    const watcherLifecycle = summarizeWatcherAlertLifecycle(alerts);
    const compilerDiagnostics = summarizeCompilerDiagnostics(alerts);

    return {
        aggregationType: 'watcher_alerts',
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
        alerts,
        summary: {
            ...watcherSummary,
            compilerDiagnostics,
            lifecycle: watcherLifecycle,
            totalAlerts: total
        },
        reconciliation: result.reconciliation
    };
}

import {
    mapSemanticIssueRowToWatcherAlert,
    summarizeWatcherAlerts,
    WATCHER_MESSAGE_PREFIX
} from '../../../../shared/compiler/index.js';

export async function handleWatcherAlerts(tool, db, options, filePath) {
    if (!db) {
        return tool.formatError('MISSING_DB', 'Repository database not initialized');
    }

    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const issueType = options.issueType || 'all';

    let whereClause = `WHERE message LIKE ?`;
    const whereParams = [`${WATCHER_MESSAGE_PREFIX}%`];

    if (filePath) {
        whereClause += ' AND file_path = ?';
        whereParams.push(filePath);
    }

    if (issueType !== 'all') {
        whereClause += ' AND issue_type = ?';
        whereParams.push(issueType);
    }

    const rows = db.prepare(`
        SELECT COUNT(*) OVER() as total_count,
               file_path, issue_type, severity, message, line_number, context_json, detected_at
        FROM semantic_issues
        ${whereClause}
        ORDER BY detected_at DESC
        LIMIT ? OFFSET ?
    `).all(...whereParams, limit, offset);

    const total = rows[0]?.total_count || 0;
    const alerts = rows.map(mapSemanticIssueRowToWatcherAlert);
    const watcherSummary = summarizeWatcherAlerts(alerts);

    return {
        aggregationType: 'watcher_alerts',
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
        alerts,
        summary: {
            ...watcherSummary,
            totalAlerts: total
        }
    };
}

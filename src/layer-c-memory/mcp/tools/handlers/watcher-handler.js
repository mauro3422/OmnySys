export async function handleWatcherAlerts(tool, db, options, filePath) {
    if (!db) {
        return tool.formatError('MISSING_DB', 'Repository database not initialized');
    }

    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const issueType = options.issueType || 'all';

    let whereClause = `WHERE message LIKE '[watcher]%'`;
    const whereParams = [];

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
    const alerts = rows.map(r => ({
        filePath: r.file_path,
        issueType: r.issue_type,
        severity: r.severity,
        message: r.message,
        lineNumber: r.line_number,
        context: (() => {
            try { return JSON.parse(r.context_json || '{}'); } catch { return {}; }
        })(),
        detectedAt: r.detected_at
    }));

    const severitySummary = alerts.reduce((acc, a) => {
        const key = a.severity || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const typeSummary = alerts.reduce((acc, a) => {
        const key = a.issueType || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    return {
        aggregationType: 'watcher_alerts',
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
        alerts,
        summary: {
            totalAlerts: total,
            bySeverity: severitySummary,
            byType: typeSummary
        }
    };
}

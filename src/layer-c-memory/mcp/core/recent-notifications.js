import { getRecentLogs, clearRecentLogs } from '../../../utils/logger.js';

function mapLoggerEntry(entry) {
  return {
    source: 'logger',
    level: entry.level,
    severity: entry.level === 'error' ? 'high' : (entry.level === 'warn' ? 'medium' : 'low'),
    message: entry.message,
    time: new Date(entry.time).toISOString()
  };
}

function mapWatcherRow(row) {
  let context = {};
  try {
    context = JSON.parse(row.context_json || '{}');
  } catch {
    context = {};
  }

  return {
    source: 'watcher',
    level: row.severity === 'high' ? 'error' : 'warn',
    severity: row.severity || 'medium',
    issueType: row.issue_type,
    filePath: row.file_path,
    message: row.message,
    detectedAt: row.detected_at,
    context
  };
}

async function loadWatcherAlerts(projectPath, limit = 10) {
  try {
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    if (!repo?.db) return [];

    return repo.db.prepare(`
      SELECT file_path, issue_type, severity, message, context_json, detected_at
      FROM semantic_issues
      WHERE message LIKE '[watcher]%'
      ORDER BY detected_at DESC
      LIMIT ?
    `).all(limit);
  } catch {
    return [];
  }
}

export async function collectRecentNotifications(projectPath, options = {}) {
  const {
    clearLoggerBuffer = true,
    watcherLimit = 10
  } = options;

  const rawLogs = typeof getRecentLogs === 'function' ? getRecentLogs() : [];
  if (clearLoggerBuffer && typeof clearRecentLogs === 'function') {
    clearRecentLogs();
  }

  const loggerEntries = rawLogs.map(mapLoggerEntry);
  const watcherEntries = (await loadWatcherAlerts(projectPath, watcherLimit)).map(mapWatcherRow);

  const warnings =
    loggerEntries.filter((entry) => entry.level === 'warn').length +
    watcherEntries.filter((entry) => entry.severity === 'medium' || entry.severity === 'low').length;

  const errors =
    loggerEntries.filter((entry) => entry.level === 'error').length +
    watcherEntries.filter((entry) => entry.severity === 'high').length;

  return {
    count: loggerEntries.length + watcherEntries.length,
    warnings,
    errors,
    logs: loggerEntries,
    watcherAlerts: watcherEntries
  };
}

export function normalizeRecentNotifications(notifications = {}) {
  const logs = Array.isArray(notifications.logs) ? notifications.logs : [];
  const watcherAlerts = Array.isArray(notifications.watcherAlerts) ? notifications.watcherAlerts : [];

  return {
    count: notifications.count || (logs.length + watcherAlerts.length),
    warnings: notifications.warnings || 0,
    errors: notifications.errors || 0,
    logs,
    watcherAlerts
  };
}


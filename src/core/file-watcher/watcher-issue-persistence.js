/**
 * @fileoverview watcher-issue-persistence.js
 *
 * Módulo compartido para persistir y limpiar issues del FileWatcher en SQLite.
 * Centraliza la lógica de persistWatcherIssue / clearWatcherIssue que antes
 * estaba duplicada en file-handlers.js y change-processing.js.
 *
 * @module file-watcher/watcher-issue-persistence
 */

import { createLogger } from '../../utils/logger.js';
import {
  WATCHER_MESSAGE_PREFIX,
  attachWatcherAlertLifecycle,
  createWatcherIssueRecord,
  findOrphanedWatcherAlertIds,
  filterWatcherAlertsByLifecycle,
  findSupersededWatcherAlertIds,
  findOutdatedWatcherAlertIds,
  mapSemanticIssueRowToWatcherAlert,
  normalizeWatcherIssueFilePath,
  partitionWatcherAlertsByLifecycle,
  shouldSuppressWatcherAlert
} from '../../shared/compiler/index.js';
import { getWatcherIssueDb } from './watcher-issue-repository.js';

const logger = createLogger('OmnySys:file-watcher:persistence');

function normalizeWatcherMessage(message = '') {
  return String(message || '').trim().replace(/^\[watcher\]\s*/i, '').trim();
}

function stableJson(value) {
  if (value == null) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

function safeJsonParse(value, fallback = {}) {
  try {
    return JSON.parse(value || '{}');
  } catch {
    return fallback;
  }
}

export function loadActiveWatcherIssue(db, filePath, issueType) {
  return db.prepare(`
    SELECT id, severity, message, context_json
    FROM semantic_issues
    WHERE file_path = ?
      AND issue_type = ?
      AND message LIKE ?
      AND (is_removed IS NULL OR is_removed = 0)
    ORDER BY detected_at DESC, id DESC
    LIMIT 1
  `).get(filePath, issueType, `${WATCHER_MESSAGE_PREFIX}%`);
}

export function clearWatcherIssueRecord(db, filePath, issueType, lifecycleStatus = 'expired') {
  return db.prepare(`
    UPDATE semantic_issues
    SET is_removed = 1,
        lifecycle_status = ?,
        updated_at = datetime('now')
    WHERE file_path = ?
      AND issue_type = ?
      AND message LIKE ?
      AND (is_removed IS NULL OR is_removed = 0)
  `).run(lifecycleStatus, filePath, issueType, `${WATCHER_MESSAGE_PREFIX}%`);
}

export function upsertWatcherIssueRecord(db, issue, options = {}) {
  const {
    logPrefix = '[WATCHER ISSUE]',
    skipIfUnchanged = true,
    supersedeLifecycleStatus = 'superseded'
  } = options;

  const existing = loadActiveWatcherIssue(db, issue.filePath, issue.issueType);
  const nextMessage = normalizeWatcherMessage(issue.message);
  const nextContextJson = stableJson(issue.context);

  if (existing && skipIfUnchanged) {
    const existingMessage = normalizeWatcherMessage(existing.message);
    const existingContextJson = stableJson(safeJsonParse(existing.context_json, {}));
    if (
      existing.severity === issue.severity &&
      existingMessage === nextMessage &&
      existingContextJson === nextContextJson
    ) {
      return false;
    }
  }

  if (existing) {
    clearWatcherIssueRecord(db, issue.filePath, issue.issueType, supersedeLifecycleStatus);
  }

  const record = createWatcherIssueRecord(issue);
  db.prepare(`
    INSERT INTO semantic_issues (file_path, issue_type, severity, message, line_number, context_json, detected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.filePath,
    record.issueType,
    record.severity,
    record.message,
    record.lineNumber,
    record.contextJson,
    record.detectedAt
  );

  logger.info(`${logPrefix}[${record.severity.toUpperCase()}] ${record.filePath} -> ${record.issueType}: ${nextMessage}`);
  return true;
}

/**
 * Persiste un issue del watcher en semantic_issues (SQLite).
 * Sobreescribe el issue previo del mismo tipo para el mismo archivo.
 *
 * @param {string} projectPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo afectado
 * @param {string} issueType - Tipo de issue (ej: 'watcher_impact_wave')
 * @param {string} severity - 'low' | 'medium' | 'high'
 * @param {string} message - Mensaje descriptivo (se prefija con '[watcher] ')
 * @param {Object} [context] - Metadata adicional a guardar como JSON
 * @returns {Promise<boolean>}
 */
export async function persistWatcherIssue(projectPath, filePath, issueType, severity, message, context = {}) {
  try {
    const db = await getWatcherIssueDb(projectPath);
    if (!db) return false;

    const normalizedFilePath = normalizeWatcherIssueFilePath(projectPath, filePath);
    return upsertWatcherIssueRecord(db, {
      filePath: normalizedFilePath,
      issueType,
      severity,
      message,
      context
    }, {
      logPrefix: '[WATCHER ISSUE]'
    });
  } catch (error) {
    logger.debug(`[WATCHER ISSUE PERSIST SKIP] ${filePath}:${issueType} -> ${error.message}`);
    return false;
  }
}

/**
 * Elimina un issue del watcher de semantic_issues (SQLite).
 * Se llama cuando el mismo archivo se procesa exitosamente,
 * indicando que el problema fue resuelto.
 *
 * @param {string} projectPath - Ruta raíz del proyecto
 * @param {string} filePath - Archivo afectado
 * @param {string} issueType - Tipo de issue a eliminar
 * @returns {Promise<boolean>}
 */
export async function clearWatcherIssue(projectPath, filePath, issueType) {
  try {
    const db = await getWatcherIssueDb(projectPath);
    if (!db) return false;

    const normalizedFilePath = normalizeWatcherIssueFilePath(projectPath, filePath);
    const result = clearWatcherIssueRecord(db, normalizedFilePath, issueType);

    if ((result?.changes || 0) > 0) {
      logger.info(`[WATCHER ISSUE CLEARED] ${normalizedFilePath} -> ${issueType}`);
    }

    return true;
  } catch (error) {
    logger.debug(`[WATCHER ISSUE CLEAR SKIP] ${filePath}:${issueType} -> ${error.message}`);
    return false;
  }
}

export async function clearWatcherIssueFamily(projectPath, filePath, issueTypePrefix) {
  try {
    const db = await getWatcherIssueDb(projectPath);
    if (!db) return false;

    const normalizedFilePath = normalizeWatcherIssueFilePath(projectPath, filePath);
    const normalizedPrefix = String(issueTypePrefix || '').trim().replace(/[_%]+$/g, '');
    if (!normalizedPrefix) return false;

    const result = db.prepare(`
      UPDATE semantic_issues
      SET is_removed = 1, updated_at = datetime('now')
      WHERE file_path = ? AND issue_type LIKE ? AND message LIKE ? AND is_removed = 0
    `).run(normalizedFilePath, `${normalizedPrefix}%`, `${WATCHER_MESSAGE_PREFIX}%`);

    if ((result?.changes || 0) > 0) {
      logger.info(`[WATCHER ISSUE FAMILY CLEARED] ${normalizedFilePath} -> ${normalizedPrefix}* (${result.changes})`);
    }

    return true;
  } catch (error) {
    logger.debug(`[WATCHER ISSUE FAMILY CLEAR SKIP] ${filePath}:${issueTypePrefix} -> ${error.message}`);
    return false;
  }
}

export async function loadWatcherIssues(projectPath, options = {}) {
  try {
    const {
      limit = 10,
      offset = 0,
      filePath,
      issueType = 'all',
      lifecycle = 'all',
      pruneExpired = true
    } = options;

    const db = await getWatcherIssueDb(projectPath);
    if (!db) {
      return { total: 0, alerts: [], reconciliation: { deletedExpired: 0, deletedSuperseded: 0, deletedOutdated: 0, summary: { total: 0, byStatus: {} } } };
    }

    const reconciliation = pruneExpired
      ? await reconcileWatcherIssues(projectPath, { db })
      : { deletedExpired: 0, deletedSuperseded: 0, deletedOutdated: 0, summary: { total: 0, byStatus: {} } };

    let whereClause = 'WHERE message LIKE ?';
    const params = [`${WATCHER_MESSAGE_PREFIX}%`];

    if (filePath) {
      whereClause += ' AND file_path = ?';
      params.push(filePath);
    }

    if (issueType !== 'all') {
      whereClause += ' AND issue_type = ?';
      params.push(issueType);
    }

    const rows = db.prepare(`
      SELECT id, file_path, issue_type, severity, message, line_number, context_json, detected_at
      FROM semantic_issues
      ${whereClause} AND (is_removed IS NULL OR is_removed = 0)
      ORDER BY detected_at DESC
    `).all(...params);

    const alerts = rows
      .map(mapSemanticIssueRowToWatcherAlert)
      .filter((alert) => !shouldSuppressWatcherAlert(alert))
      .map((alert) => attachWatcherAlertLifecycle(alert));
    const filtered = filterWatcherAlertsByLifecycle(alerts, lifecycle);

    return {
      total: filtered.length,
      alerts: filtered.slice(offset, offset + limit),
      reconciliation
    };
  } catch (error) {
    logger.debug(`[WATCHER ISSUE LOAD SKIP] ${error.message}`);
    return { total: 0, alerts: [], reconciliation: { deletedExpired: 0, deletedSuperseded: 0, deletedOutdated: 0, deletedLowSignal: 0, summary: { total: 0, byStatus: {} } } };
  }
}

export async function reconcileWatcherIssues(projectPath, options = {}) {
  try {
    const { db: existingDb = null, maxDelete = 500 } = options;
    const db = existingDb || await getWatcherIssueDb(projectPath);
    if (!db) {
      return { deletedExpired: 0, summary: { total: 0, byStatus: {} } };
    }

    const rows = db.prepare(`
      SELECT id, file_path, issue_type, severity, message, line_number, context_json, detected_at
      FROM semantic_issues
      WHERE message LIKE ? AND (is_removed IS NULL OR is_removed = 0)
      ORDER BY detected_at DESC
    `).all(`${WATCHER_MESSAGE_PREFIX}%`);

    const alerts = rows.map(mapSemanticIssueRowToWatcherAlert);
    const partitioned = partitionWatcherAlertsByLifecycle(alerts);
    const expiredIds = partitioned.expired
      .map((alert) => alert.id)
      .filter((id) => Number.isInteger(id))
      .slice(0, maxDelete);
    const supersededIds = findSupersededWatcherAlertIds(alerts).slice(0, maxDelete);

    const outdatedIds = (await findOutdatedWatcherAlertIds(projectPath, alerts)).slice(0, maxDelete);
    const orphanedIds = findOrphanedWatcherAlertIds(db, alerts).slice(0, maxDelete);
    const lowSignalIds = alerts
      .filter((alert) => shouldSuppressWatcherAlert(alert))
      .map((alert) => alert.id)
      .filter((id) => Number.isInteger(id))
      .slice(0, maxDelete);

    const idsToDelete = [...new Set([...expiredIds, ...supersededIds, ...outdatedIds, ...orphanedIds, ...lowSignalIds])].slice(0, maxDelete);

    if (idsToDelete.length > 0) {
      const placeholders = idsToDelete.map(() => '?').join(', ');
      db.prepare(`
        UPDATE semantic_issues 
        SET is_removed = 1, updated_at = datetime('now') 
        WHERE id IN (${placeholders})
      `).run(...idsToDelete);
      logger.info(
        `[WATCHER ISSUE RECONCILE] deleted ${idsToDelete.length} watcher alert(s)` +
        ` (expired=${expiredIds.length}, superseded=${supersededIds.length}, outdated=${outdatedIds.length}, orphaned=${orphanedIds.length}, lowSignal=${lowSignalIds.length})`
      );
    }

    return {
      deletedExpired: expiredIds.length,
      deletedSuperseded: supersededIds.length,
      deletedOutdated: outdatedIds.length,
      deletedOrphaned: orphanedIds.length,
      deletedLowSignal: lowSignalIds.length,
      summary: partitioned.summary
    };
  } catch (error) {
    logger.debug(`[WATCHER ISSUE RECONCILE SKIP] ${error.message}`);
    return { deletedExpired: 0, deletedSuperseded: 0, deletedOutdated: 0, deletedOrphaned: 0, deletedLowSignal: 0, summary: { total: 0, byStatus: {} } };
  }
}

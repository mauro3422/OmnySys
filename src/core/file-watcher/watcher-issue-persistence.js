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
  REPOSITORY_MUTATION_DURABILITY,
  runRepositoryMutation
} from '#layer-c/storage/repository/index.js';
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
  shouldSuppressWatcherAlert,
  summarizeAtomSemanticPurity
} from '../../shared/compiler/index.js';
import { getWatcherIssueDb } from './watcher-issue-repository.js';
import { createEmptyWatcherIssueLoadResult, createWatcherIssueReconciliationSummary, normalizeWatcherMessage, safeJsonParse, stableJson } from './watcher-issue-persistence-support.js';

const logger = createLogger('OmnySys:file-watcher:persistence');

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
    const normalizedFilePath = normalizeWatcherIssueFilePath(projectPath, filePath);
    const result = await runRepositoryMutation(
      projectPath,
      {
        key: `watcher:${normalizedFilePath}:${issueType}`,
        label: `watcher:${issueType}`,
        durability: REPOSITORY_MUTATION_DURABILITY.DURABLE,
        metadata: { filePath: normalizedFilePath, issueType, severity },
        run: (repo) => {
          const db = repo?.db;
          if (!db) return false;
          const semanticPurity = summarizeAtomSemanticPurity([]);
          return upsertWatcherIssueRecord(
            db,
            { filePath: normalizedFilePath, issueType, severity, message, context: { ...context, semanticPurity } },
            { logPrefix: '[WATCHER ISSUE]' }
          );
        }
      },
      { durability: REPOSITORY_MUTATION_DURABILITY.DURABLE }
    );

    return result.success !== false;
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
    const normalizedFilePath = normalizeWatcherIssueFilePath(projectPath, filePath);
    const result = await runRepositoryMutation(
      projectPath,
      {
        key: `watcher-clear:${normalizedFilePath}:${issueType}`,
        label: `watcher-clear:${issueType}`,
        durability: REPOSITORY_MUTATION_DURABILITY.DURABLE,
        metadata: { filePath: normalizedFilePath, issueType },
        run: (repo) => {
          const db = repo?.db;
          if (!db) return false;
          const clearResult = clearWatcherIssueRecord(db, normalizedFilePath, issueType);
          if ((clearResult?.changes || 0) > 0) {
            logger.info(`[WATCHER ISSUE CLEARED] ${normalizedFilePath} -> ${issueType}`);
          }
          return clearResult;
        }
      },
      { durability: REPOSITORY_MUTATION_DURABILITY.DURABLE }
    );

    return result.success !== false;
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
    const { limit = 10, offset = 0, filePath, issueType = 'all', lifecycle = 'all', pruneExpired = true } = options;

    const db = await getWatcherIssueDb(projectPath);
    if (!db) return createEmptyWatcherIssueLoadResult();

    const reconciliation = pruneExpired ? await reconcileWatcherIssues(projectPath, { db }) : createWatcherIssueReconciliationSummary();

    let whereClause = 'WHERE message LIKE ?';
    const params = [`${WATCHER_MESSAGE_PREFIX}%`];

    if (filePath) { whereClause += ' AND file_path = ?'; params.push(filePath); }

    if (issueType !== 'all') { whereClause += ' AND issue_type = ?'; params.push(issueType); }

    const rows = loadWatcherIssueRows(db, whereClause, params);
    const alerts = rows
      .map(mapSemanticIssueRowToWatcherAlert)
      .filter((alert) => !shouldSuppressWatcherAlert(alert))
      .map((alert) => attachWatcherAlertLifecycle(alert));
    const filtered = filterWatcherAlertsByLifecycle(alerts, lifecycle);

    return { total: filtered.length, alerts: filtered.slice(offset, offset + limit), reconciliation };
  } catch (error) {
    logger.debug(`[WATCHER ISSUE LOAD SKIP] ${error.message}`);
    return createEmptyWatcherIssueLoadResult();
  }
}

export async function reconcileWatcherIssues(projectPath, options = {}) {
  try {
    const { db: existingDb = null, maxDelete = 500 } = options;
    const db = existingDb || await getWatcherIssueDb(projectPath);
    if (!db) return createWatcherIssueReconciliationSummary();

    const rows = loadReconciliationRows(db);
    const alerts = rows.map(mapSemanticIssueRowToWatcherAlert);
    const partitioned = partitionWatcherAlertsByLifecycle(alerts);
    const idsToDelete = await collectWatcherIssueDeletionIds(projectPath, db, alerts, partitioned, maxDelete);

    if (idsToDelete.length > 0) {
      deleteWatcherIssueIds(db, idsToDelete);
      logger.info(
        `[WATCHER ISSUE RECONCILE] deleted ${idsToDelete.length} watcher alert(s)` +
        ` (${formatWatcherReconciliationSummary(partitioned, idsToDelete)})`
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
    return createWatcherIssueReconciliationSummary();
  }
}

function loadWatcherIssueRows(db, whereClause, params) {
  return db.prepare(`
    SELECT id, file_path, issue_type, severity, message, line_number, context_json, detected_at
    FROM semantic_issues
    ${whereClause} AND (is_removed IS NULL OR is_removed = 0)
    ORDER BY detected_at DESC
  `).all(...params);
}

function loadReconciliationRows(db) {
  return db.prepare(`
    SELECT id, file_path, issue_type, severity, message, line_number, context_json, detected_at
    FROM semantic_issues
    WHERE message LIKE ? AND (is_removed IS NULL OR is_removed = 0)
    ORDER BY detected_at DESC
  `).all(`${WATCHER_MESSAGE_PREFIX}%`);
}

async function collectWatcherIssueDeletionIds(projectPath, db, alerts, partitioned, maxDelete) {
  const expiredIds = partitioned.expired
    .map((alert) => alert.id)
    .filter((id) => Number.isInteger(id))
    .slice(0, maxDelete);
  const supersededIds = findSupersededWatcherAlertIds(alerts).slice(0, maxDelete);
  const outdatedIds = (await findOutdatedWatcherAlertIds(projectPath, alerts, { db })).slice(0, maxDelete);
  const orphanedIds = findOrphanedWatcherAlertIds(db, alerts).slice(0, maxDelete);
  const lowSignalIds = alerts
    .filter((alert) => shouldSuppressWatcherAlert(alert))
    .map((alert) => alert.id)
    .filter((id) => Number.isInteger(id))
    .slice(0, maxDelete);

  return [...new Set([...expiredIds, ...supersededIds, ...outdatedIds, ...orphanedIds, ...lowSignalIds])].slice(0, maxDelete);
}

function deleteWatcherIssueIds(db, idsToDelete) {
  const placeholders = idsToDelete.map(() => '?').join(', ');
  db.prepare(`
    UPDATE semantic_issues
    SET is_removed = 1, updated_at = datetime('now')
    WHERE id IN (${placeholders})
  `).run(...idsToDelete);
}

function formatWatcherReconciliationSummary(partitioned, idsToDelete) {
  return [
    `expired=${partitioned.expired.length}`,
    `superseded=${partitioned.superseded.length}`,
    `outdated=${partitioned.outdated?.length || 0}`,
    `orphaned=${partitioned.orphaned?.length || 0}`,
    `lowSignal=${partitioned.lowSignal?.length || 0}`,
    `deleted=${idsToDelete.length}`
  ].join(', ');
}

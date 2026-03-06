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
  filterWatcherAlertsByLifecycle,
  findSupersededWatcherAlertIds,
  mapSemanticIssueRowToWatcherAlert,
  partitionWatcherAlertsByLifecycle
} from '../../shared/compiler/index.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('OmnySys:file-watcher:persistence');

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
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    if (!repo?.db) return false;

    const record = createWatcherIssueRecord({
      filePath,
      issueType,
      severity,
      message,
      context
    });

    repo.db.prepare(`
      DELETE FROM semantic_issues
      WHERE file_path = ? AND issue_type = ? AND message LIKE ?
    `).run(filePath, issueType, `${WATCHER_MESSAGE_PREFIX}%`);

    repo.db.prepare(`
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

    logger.info(`[WATCHER ISSUE][${record.severity.toUpperCase()}] ${record.filePath} -> ${record.issueType}: ${message}`);
    return true;
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
    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    if (!repo?.db) return false;

    const result = repo.db.prepare(`
      DELETE FROM semantic_issues
      WHERE file_path = ? AND issue_type = ? AND message LIKE ?
    `).run(filePath, issueType, `${WATCHER_MESSAGE_PREFIX}%`);

    if ((result?.changes || 0) > 0) {
      logger.info(`[WATCHER ISSUE CLEARED] ${filePath} -> ${issueType}`);
    }

    return true;
  } catch (error) {
    logger.debug(`[WATCHER ISSUE CLEAR SKIP] ${filePath}:${issueType} -> ${error.message}`);
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

    const { getRepository } = await import('#layer-c/storage/repository/index.js');
    const repo = getRepository(projectPath);
    if (!repo?.db) {
      return { total: 0, alerts: [], reconciliation: { deletedExpired: 0, deletedSuperseded: 0, deletedOutdated: 0, summary: { total: 0, byStatus: {} } } };
    }

    const reconciliation = pruneExpired
      ? await reconcileWatcherIssues(projectPath, { repo })
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

    const rows = repo.db.prepare(`
      SELECT id, file_path, issue_type, severity, message, line_number, context_json, detected_at
      FROM semantic_issues
      ${whereClause}
      ORDER BY detected_at DESC
    `).all(...params);

    const alerts = rows
      .map(mapSemanticIssueRowToWatcherAlert)
      .map((alert) => attachWatcherAlertLifecycle(alert));
    const filtered = filterWatcherAlertsByLifecycle(alerts, lifecycle);

    return {
      total: filtered.length,
      alerts: filtered.slice(offset, offset + limit),
      reconciliation
    };
  } catch (error) {
    logger.debug(`[WATCHER ISSUE LOAD SKIP] ${error.message}`);
    return { total: 0, alerts: [], reconciliation: { deletedExpired: 0, deletedSuperseded: 0, deletedOutdated: 0, summary: { total: 0, byStatus: {} } } };
  }
}

export async function reconcileWatcherIssues(projectPath, options = {}) {
  try {
    const { repo: existingRepo = null, maxDelete = 500 } = options;
    const repo = existingRepo || (await import('#layer-c/storage/repository/index.js')).getRepository(projectPath);
    if (!repo?.db) {
      return { deletedExpired: 0, summary: { total: 0, byStatus: {} } };
    }

    const rows = repo.db.prepare(`
      SELECT id, file_path, issue_type, severity, message, line_number, context_json, detected_at
      FROM semantic_issues
      WHERE message LIKE ?
      ORDER BY detected_at DESC
    `).all(`${WATCHER_MESSAGE_PREFIX}%`);

    const alerts = rows.map(mapSemanticIssueRowToWatcherAlert);
    const partitioned = partitionWatcherAlertsByLifecycle(alerts);
    const expiredIds = partitioned.expired
      .map((alert) => alert.id)
      .filter((id) => Number.isInteger(id))
      .slice(0, maxDelete);
    const supersededIds = findSupersededWatcherAlertIds(alerts).slice(0, maxDelete);

    const outdatedIds = [];
    for (const alert of alerts) {
      const id = alert?.id;
      if (!Number.isInteger(id)) continue;

      const detectedAtMs = Date.parse(alert?.detectedAt || '');
      if (!Number.isFinite(detectedAtMs)) continue;

      const relativePath = String(alert?.filePath || '');
      if (!relativePath) continue;

      const absolutePath = path.resolve(projectPath, relativePath);
      try {
        const stat = await fs.stat(absolutePath);
        if (stat.mtimeMs > (detectedAtMs + 1000)) {
          outdatedIds.push(id);
        }
      } catch {
        // If the file no longer exists, let regular lifecycle/cleanup handle it.
      }
    }

    const idsToDelete = [...new Set([...expiredIds, ...supersededIds, ...outdatedIds])].slice(0, maxDelete);

    if (idsToDelete.length > 0) {
      const placeholders = idsToDelete.map(() => '?').join(', ');
      repo.db.prepare(`DELETE FROM semantic_issues WHERE id IN (${placeholders})`).run(...idsToDelete);
      logger.info(
        `[WATCHER ISSUE RECONCILE] deleted ${idsToDelete.length} watcher alert(s)` +
        ` (expired=${expiredIds.length}, superseded=${supersededIds.length}, outdated=${outdatedIds.length})`
      );
    }

    return {
      deletedExpired: expiredIds.length,
      deletedSuperseded: supersededIds.length,
      deletedOutdated: outdatedIds.length,
      summary: partitioned.summary
    };
  } catch (error) {
    logger.debug(`[WATCHER ISSUE RECONCILE SKIP] ${error.message}`);
    return { deletedExpired: 0, deletedSuperseded: 0, deletedOutdated: 0, summary: { total: 0, byStatus: {} } };
  }
}

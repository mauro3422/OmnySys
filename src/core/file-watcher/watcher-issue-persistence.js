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
  createWatcherIssueRecord
} from '../../shared/compiler/index.js';

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

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

    const detectedAt = new Date().toISOString();
    const dbMessage = `[watcher] ${message}`;
    const contextJson = JSON.stringify({ source: 'file_watcher', ...context });

    repo.db.prepare(`
      DELETE FROM semantic_issues
      WHERE file_path = ? AND issue_type = ? AND message LIKE '[watcher]%'
    `).run(filePath, issueType);

    repo.db.prepare(`
      INSERT INTO semantic_issues (file_path, issue_type, severity, message, line_number, context_json, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(filePath, issueType, severity, dbMessage, null, contextJson, detectedAt);

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

    repo.db.prepare(`
      DELETE FROM semantic_issues
      WHERE file_path = ? AND issue_type = ? AND message LIKE '[watcher]%'
    `).run(filePath, issueType);

    return true;
  } catch (error) {
    logger.debug(`[WATCHER ISSUE CLEAR SKIP] ${filePath}:${issueType} -> ${error.message}`);
    return false;
  }
}

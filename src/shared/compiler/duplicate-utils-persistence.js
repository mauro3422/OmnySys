/**
 * @fileoverview Duplicate persistence/history helpers.
 *
 * @module shared/compiler/duplicate-utils-persistence
 */

import { normalizeFilePath } from './path-normalization.js';

/**
 * Carga findings previos de semantic_issues para trackear historial.
 *
 * @param {Object} db
 * @param {string} filePath
 * @param {string} [issueTypePrefix]
 * @returns {Array<Object>}
 */
export function loadPreviousFindings(db, filePath, issueTypePrefix = 'code_duplicate') {
  try {
    if (!db || !filePath) return [];

    const normalizedPath = normalizeFilePath(filePath);
    const rows = db.prepare(`
      SELECT context_json, detected_at
      FROM semantic_issues
      WHERE file_path = ?
        AND issue_type LIKE ?
        AND message LIKE '[watcher]%'
      ORDER BY detected_at DESC
      LIMIT 1
    `).all(normalizedPath, `${issueTypePrefix}%`);

    if (rows.length === 0) return [];

    const findings = [];
    for (const row of rows) {
      try {
        const context = JSON.parse(row.context_json);
        if (context?.findings && Array.isArray(context.findings)) {
          findings.push(...context.findings);
        }
      } catch (error) {
        console.debug(`[LOAD PREVIOUS FINDINGS] Parse error for ${filePath}: ${error.message}`);
      }
    }

    return findings;
  } catch (error) {
    console.debug(`[LOAD PREVIOUS FINDINGS] Error for ${filePath}: ${error.message}`);
    return [];
  }
}

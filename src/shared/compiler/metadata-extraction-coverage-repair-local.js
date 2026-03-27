/**
 * @fileoverview Local backfills for metadata extraction coverage repair.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-local
 */

import { isTestFilePath } from '../../core/file-watcher/guards/impact-wave-helpers.js';
import { inferTestCallbackType } from '../../layer-a-static/pipeline/phases/atom-extraction/builders/metadata-builder.js';
import { getTableColumns, hasColumn, normalizeDbPath } from './metadata-extraction-coverage-repair-shared.js';

export function backfillAtomTestCallbackTypes(db, nowIso) {
  const rows = db.prepare(`
    SELECT id, name, file_path
    FROM atoms
    WHERE (is_removed IS NULL OR is_removed = 0)
      AND (test_callback_type IS NULL OR test_callback_type = '')
  `).all();

  if (!Array.isArray(rows) || rows.length === 0) {
    return 0;
  }

  const updateStmt = db.prepare(`
    UPDATE atoms
    SET test_callback_type = ?, is_test_callback = 1, updated_at = ?
    WHERE id = ?
  `);

  let updated = 0;
  for (const row of rows) {
    if (!isTestFilePath(row?.file_path)) continue;

    const callbackType = inferTestCallbackType({ name: row?.name || '' });
    if (!callbackType) continue;

    updateStmt.run(callbackType, nowIso, row.id);
    updated++;
  }

  return updated;
}

export function backfillFileHashes(db, nowIso) {
  const hashRows = db.prepare(`
    SELECT file_path, content_hash
    FROM file_hashes
    WHERE content_hash IS NOT NULL
      AND content_hash != ''
  `).all();

  if (!Array.isArray(hashRows) || hashRows.length === 0) {
    return 0;
  }

  const updates = new Map();
  for (const row of hashRows) {
    const path = normalizeDbPath(row?.file_path || '');
    const hash = String(row?.content_hash || '').trim();
    if (!path || !hash) continue;
    updates.set(path, hash);
  }

  if (updates.size === 0) {
    return 0;
  }

  const fileColumns = getTableColumns(db, 'files');
  const hasUpdatedAt = hasColumn(fileColumns, 'updated_at');
  const updateSql = hasUpdatedAt
    ? `UPDATE files SET hash = ?, updated_at = ? WHERE path = ? AND (hash IS NULL OR hash = '')`
    : `UPDATE files SET hash = ? WHERE path = ? AND (hash IS NULL OR hash = '')`;
  const updateStmt = db.prepare(updateSql);

  let updated = 0;
  for (const [filePath, hash] of updates) {
    const result = hasUpdatedAt
      ? updateStmt.run(hash, nowIso, filePath)
      : updateStmt.run(hash, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

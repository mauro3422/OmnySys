/**
 * @fileoverview Local backfills for metadata extraction coverage repair.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-local
 */

import { isTestFilePath } from '../../core/file-watcher/guards/impact-wave/helpers.js';
import { inferTestCallbackType } from '../../layer-a-static/pipeline/phases/atom-extraction/builders/metadata-builder.js';

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

// backfillFileHashes eliminada: file_hashes es ahora la fuente de verdad.
// Ya no se necesita sincronizar con files.hash (columna deprecada).

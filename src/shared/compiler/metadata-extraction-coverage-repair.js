/**
 * @fileoverview Repair helpers for metadata extraction coverage.
 *
 * Backfills canonical metadata fields from already-persisted support tables so
 * the runtime can self-heal when a new field was added but old rows were never
 * materialized.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair
 */

import {
  backfillSystemFileCalls,
  backfillSystemFileDefinitionsAndCulture,
  backfillSystemFileIdentifierRefs,
} from './metadata-extraction-coverage-repair-system-files.js';
import {
  backfillSystemFileSemanticAnalysis,
  backfillSystemFileTransitiveDependents,
  backfillSystemFileTransitiveDepends
} from './metadata-extraction-coverage-repair-system-file-links.js';
import { isTestFilePath } from '../../core/file-watcher/guards/impact-wave-helpers.js';
import { inferTestCallbackType } from '../../layer-a-static/pipeline/phases/atom-extraction/builders/metadata-builder.js';

function normalizeDbPath(value = '') {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function getTableColumns(db, table) {
  return db.prepare(`PRAGMA table_info("${table}")`).all();
}

function hasColumn(columns, columnName) {
  return Array.isArray(columns) && columns.some((column) => column?.name === columnName);
}

function backfillAtomTestCallbackTypes(db, nowIso) {
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

function backfillFileHashes(db, nowIso) {
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

export function repairMetadataExtractionCoverage(db) {
  if (!db?.prepare) {
    return {
      repaired: false,
      atomsUpdated: 0,
      fileHashesUpdated: 0,
      systemFilesUpdated: 0,
      systemFilesCallsUpdated: 0,
      rebuiltFrom: 'metadata_extraction_coverage'
    };
  }

  const nowIso = new Date().toISOString();
  const atomsUpdated = backfillAtomTestCallbackTypes(db, nowIso);
  const fileHashesUpdated = backfillFileHashes(db, nowIso);
  const systemFilesCallsUpdated = backfillSystemFileCalls(db, nowIso);
  const systemFilesMetadataUpdated = backfillSystemFileDefinitionsAndCulture(db, nowIso);
  const systemFilesIdentifiersUpdated = backfillSystemFileIdentifierRefs(db, nowIso);
  const systemFilesSemanticUpdated = backfillSystemFileSemanticAnalysis(db, nowIso);
  const systemFilesTransitiveUpdated = backfillSystemFileTransitiveDependents(db, nowIso);
  const systemFilesTransitiveDependsUpdated = backfillSystemFileTransitiveDepends(db, nowIso);

  return {
    repaired:
      atomsUpdated > 0 ||
      fileHashesUpdated > 0 ||
      systemFilesCallsUpdated > 0 ||
      systemFilesMetadataUpdated > 0 ||
      systemFilesIdentifiersUpdated > 0 ||
      systemFilesSemanticUpdated > 0 ||
      systemFilesTransitiveUpdated > 0 ||
      systemFilesTransitiveDependsUpdated > 0,
    atomsUpdated,
    fileHashesUpdated,
    systemFilesUpdated: systemFilesCallsUpdated,
    systemFilesCallsUpdated,
    systemFilesMetadataUpdated,
    systemFilesIdentifiersUpdated,
    systemFilesSemanticUpdated,
    systemFilesTransitiveUpdated,
    systemFilesTransitiveDependsUpdated,
    rebuiltFrom: 'metadata_extraction_coverage'
  };
}

export default repairMetadataExtractionCoverage;

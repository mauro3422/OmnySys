/**
 * @fileoverview Backfill entrypoints for system-file repair coverage.
 *
 * @module shared/compiler/metadata-extraction-coverage-repair-system-files-backfill
 */

import { getTableColumns, hasColumn } from './metadata-extraction-coverage-repair-shared.js';
import { buildConditionalUpdateStatement, runConditionalUpdate } from './metadata-extraction-coverage-repair-updates.js';
import {
  buildAtomDefinitionsByPath,
  buildSystemFileCallsByPath,
  buildSystemFileIdentifiersByPath,
  resolveSystemFileMetadata
} from './metadata-extraction-coverage-repair-system-files-grouping.js';
import { backfillSystemFileSemanticAnalysis, backfillSystemFileTransitiveDependents, backfillSystemFileTransitiveDepends } from './metadata-extraction-coverage-repair-system-file-links.js';

export function backfillSystemFileCalls(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateStmt = buildConditionalUpdateStatement(db, 'system_files', 'calls_json', "calls_json IS NULL OR calls_json = '' OR calls_json = '[]'", hasUpdatedAt);
  const groupedCalls = buildSystemFileCallsByPath(db);

  if (groupedCalls.size === 0) {
    return 0;
  }

  let updated = 0;
  for (const [filePath, bucket] of groupedCalls.entries()) {
    const payload = JSON.stringify(bucket.items);
    const result = runConditionalUpdate(updateStmt, hasUpdatedAt, payload, nowIso, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

export function backfillSystemFileDefinitionsAndCulture(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const definitionsByPath = buildAtomDefinitionsByPath(db);
  const rows = db.prepare(`
    SELECT path, culture, culture_role, definitions_json, exports_json
    FROM system_files
    WHERE (is_removed IS NULL OR is_removed = 0)
  `).all();

  let updated = 0;
  for (const row of rows) {
    const patch = resolveSystemFileMetadata(row, definitionsByPath);
    if (!patch) continue;

    const hasMissingCulture = !String(row?.culture || '').trim();
    const hasMissingRole = !String(row?.culture_role || '').trim();
    const hasMissingDefinitions = !String(row?.definitions_json || '').trim() || row?.definitions_json === '[]';
    if (!hasMissingCulture && !hasMissingRole && !hasMissingDefinitions) {
      continue;
    }

    const updateSql = hasUpdatedAt
      ? `UPDATE system_files SET culture = ?, culture_role = ?, definitions_json = ?, updated_at = ? WHERE path = ?`
      : `UPDATE system_files SET culture = ?, culture_role = ?, definitions_json = ? WHERE path = ?`;
    const updateStmt = db.prepare(updateSql);
    const result = hasUpdatedAt
      ? updateStmt.run(patch.culture, patch.cultureRole, patch.definitionsJson, nowIso, patch.filePath)
      : updateStmt.run(patch.culture, patch.cultureRole, patch.definitionsJson, patch.filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

export function backfillSystemFileIdentifierRefs(db, nowIso) {
  const systemFileColumns = getTableColumns(db, 'system_files');
  const hasUpdatedAt = hasColumn(systemFileColumns, 'updated_at');
  const updateStmt = buildConditionalUpdateStatement(db, 'system_files', 'identifier_refs_json', "identifier_refs_json IS NULL OR identifier_refs_json = '' OR identifier_refs_json = '[]'", hasUpdatedAt);
  const groupedIdentifiers = buildSystemFileIdentifiersByPath(db);

  if (groupedIdentifiers.size === 0) {
    return 0;
  }

  let updated = 0;
  for (const [filePath, bucket] of groupedIdentifiers.entries()) {
    const payload = JSON.stringify(bucket.items);
    const result = runConditionalUpdate(updateStmt, hasUpdatedAt, payload, nowIso, filePath);
    updated += Number(result?.changes || 0);
  }

  return updated;
}

export {
  backfillSystemFileSemanticAnalysis,
  backfillSystemFileTransitiveDependents,
  backfillSystemFileTransitiveDepends
} from './metadata-extraction-coverage-repair-system-file-links.js';

import { startTimer } from '../../utils/performance-tracker.js';
import { getRepository } from '#layer-c/storage/repository/index.js';
import { buildCanonicalAtomIdVariants } from '../../layer-c-memory/storage/repository/adapters/helpers/canonical-atom-id.js';
import { normalizeCanonicalAtomId } from '../../layer-c-memory/storage/repository/adapters/helpers/canonical-atom-id.js';
import { primeActiveAtomCache, resolveCallTargetId } from '../../layer-c-memory/storage/repository/adapters/helpers/call-target-resolver.js';
import { chunkArray } from '../../shared/utils/array-utils.js';

function buildSourceIds(atomsToSync, absoluteRootPath) {
  return [...new Set(
    atomsToSync.flatMap((atom) => buildCanonicalAtomIdVariants(atom?.id, absoluteRootPath))
  )];
}

function clearExistingCallRelations(db, sourceIds) {
  if (sourceIds.length === 0) return;

  for (const chunk of chunkArray(sourceIds, 500)) {
    const clearStmt = db.prepare(`
      UPDATE atom_relations
      SET is_removed = 1,
          lifecycle_status = 'removed',
          updated_at = ?
      WHERE relation_type = 'calls'
        AND source_id IN (${chunk.map(() => '?').join(', ')})
    `);
    clearStmt.run(new Date().toISOString(), ...chunk);
  }
}

function buildRelationRows(atomsToSync) {
  const rows = [];
  for (const atom of atomsToSync) {
    if (!atom.calls || atom.calls.length === 0) continue;
    for (const call of atom.calls) {
      rows.push({ atomId: atom.id, call });
    }
  }
  return rows;
}

/**
 * Build a name→atomId index for fast relation resolution.
 * This avoids per-relation DB queries during bulk save.
 */
function buildCallTargetIndex(allAtoms) {
  const byName = new Map();
  const byQualifiedName = new Map();
  const byId = new Map();

  for (const atom of allAtoms) {
    if (!atom?.id || !atom?.name) continue;

    byId.set(atom.id, atom.id);
    byName.set(atom.name, atom.id);

    if (atom.className) {
      byQualifiedName.set(`${atom.className}.${atom.name}`, atom.id);
    }
  }

  return { byName, byQualifiedName, byId };
}

/**
 * Resolve call target using in-memory index instead of DB queries.
 */
function resolveCallTargetFast(call, sourceAtomId, index) {
  if (!call?.name) return null;

  // Direct ID match
  if (call.id && index.byId.has(call.id)) return call.id;

  // Qualified name match (ClassName.methodName)
  if (call.name.includes('.')) {
    const qualified = index.byQualifiedName.get(call.name);
    if (qualified) return qualified;
  }

  // Simple name match
  return index.byName.get(call.name) || null;
}

function saveRelationRowsWithRepo(repo, relationRows, allAtoms, absoluteRootPath, logger) {
  if (relationRows.length === 0) return;

  // Fast path: resolve all targets using in-memory index (no DB queries)
  const targetIndex = buildCallTargetIndex(allAtoms);
  const now = new Date().toISOString();
  const normalizeFn = (id) => {
    if (!id) return null;
    // Already normalized if it contains the project path
    return id.includes(absoluteRootPath.replace(/\\/g, '/')) ? id : `${absoluteRootPath.replace(/\\/g, '/')}/${id}`;
  };

  const resolvedRows = [];
  for (const row of relationRows) {
    const targetId = resolveCallTargetFast(row.call, row.atomId, targetIndex);
    if (!targetId) continue;

    const contextJson = typeof row.call === 'object' ? JSON.stringify(row.call) : '{}';
    resolvedRows.push({
      source_id: row.atomId,
      target_id: targetId,
      relation_type: 'calls',
      weight: typeof row.call?.weight === 'number' ? row.call.weight : 1.0,
      line_number: typeof row.call?.line === 'number' ? row.call.line : null,
      context_json: contextJson,
      created_at: now,
      is_removed: 0,
      lifecycle_status: 'active',
      updated_at: now
    });
  }

  if (resolvedRows.length === 0) return;

  // Bulk insert with a single transaction
  const insertStmt = repo.db.prepare(`
    INSERT OR REPLACE INTO atom_relations
    (source_id, target_id, relation_type, weight, line_number, context_json, created_at, is_removed, lifecycle_status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = repo.db.transaction((rows) => {
    for (const r of rows) {
      insertStmt.run(r.source_id, r.target_id, r.relation_type, r.weight, r.line_number, r.context_json, r.created_at, r.is_removed, r.lifecycle_status, r.updated_at);
    }
  });

  // Process in batches to avoid memory issues
  const batchSize = 5000;
  for (let i = 0; i < resolvedRows.length; i += batchSize) {
    const batch = resolvedRows.slice(i, i + batchSize);
    tx(batch);
  }

  if (logger) logger.debug(`  Bulk inserted ${resolvedRows.length} call relations`);
}

function persistSqlQueryRelations(db, allAtoms, verbose, logger) {
  const insertRelation = db.prepare(`
    INSERT OR IGNORE INTO atom_relations (source_id, target_id, relation_type, weight, line_number, created_at)
    VALUES (?, ?, 'executes_sql', 1.0, ?, datetime('now'))
  `);
  const insertBatch = db.transaction((rels) => {
    for (const relation of rels) insertRelation.run(relation.sourceId, relation.targetId, relation.line);
  });

  const sqlRelations = [];
  for (const atom of allAtoms) {
    if (atom.type !== 'sql_query') continue;
    const meta = atom._meta || {};
    if (meta.parent_atom_id) {
      sqlRelations.push({ sourceId: meta.parent_atom_id, targetId: atom.id, line: atom.lineStart || 0 });
    }
  }

  if (sqlRelations.length > 0) {
    insertBatch(sqlRelations);
    if (verbose) logger.info(`  ✓ ${sqlRelations.length} executes_sql relations saved`);
  }
}

export function persistAtomCalls(repo, atomId, calls, projectPath, logger) {
  if (!calls || calls.length === 0) return 0;

  const now = new Date().toISOString();
  let savedCount = 0;

  const insertStmt = repo.db.prepare(`
    INSERT INTO atom_relations
    (source_id, target_id, relation_type, weight, line_number, context_json, created_at, is_removed, lifecycle_status, updated_at)
    VALUES (?, ?, 'calls', ?, ?, ?, ?, 0, 'active', ?)
    ON CONFLICT(source_id, target_id, relation_type, line_number) DO UPDATE SET
      weight = excluded.weight,
      line_number = excluded.line_number,
      context_json = excluded.context_json,
      is_removed = 0,
      lifecycle_status = 'active',
      updated_at = excluded.created_at
  `);

  const normalizedSourceId = normalizeCanonicalAtomId(atomId, projectPath);
  const sourceIdVariants = buildCanonicalAtomIdVariants(atomId, projectPath);
  const resolverCache = {
    importsBySourcePath: new Map(),
    resolvedTargets: new Map()
  };
  primeActiveAtomCache(repo.db, resolverCache);

  if (sourceIdVariants.length > 0) {
    const deleteStmt = repo.db.prepare(`DELETE FROM atom_relations WHERE source_id = ? AND relation_type = 'calls'`);
    const deleteBatch = repo.db.transaction((ids) => {
      for (const sourceId of ids) {
        deleteStmt.run(sourceId);
      }
    });
    deleteBatch(sourceIdVariants);
  }

  for (const call of calls) {
    const targetId = resolveCallTargetId(
      repo.db,
      normalizedSourceId,
      call,
      (id) => normalizeCanonicalAtomId(id, projectPath),
      resolverCache
    );
    if (!targetId) continue;

    const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
    const lineNumber = typeof call?.line === 'number' ? call.line : null;

    let contextJson = '{}';
    try {
      contextJson = JSON.stringify(call && typeof call === 'object' ? call : {});
    } catch {
      contextJson = '{}';
    }

    try {
      insertStmt.run(normalizedSourceId, targetId, weight, lineNumber, contextJson, now, now);
      savedCount++;
    } catch {
      // Ignore duplicates and other row-level conflicts.
    }
  }

  return savedCount;
}

export async function persistCallRelations(allAtoms, absoluteRootPath, verbose, relationSyncAtoms = null, logger) {
  const repo = getRepository(absoluteRootPath);
  if (!repo.saveCalls) {
    if (verbose) logger.warn('  ⚠️ Repository does not support saveCalls');
    return;
  }

  const atomsToSync = Array.isArray(relationSyncAtoms) && relationSyncAtoms.length > 0
    ? relationSyncAtoms
    : allAtoms;

  // Skip clear on fresh reindex — table is empty
  const relationCount = repo.db.prepare(`SELECT COUNT(*) as cnt FROM atom_relations`).get();
  if (relationCount && relationCount.cnt > 0) {
    clearExistingCallRelations(repo.db, buildSourceIds(atomsToSync, absoluteRootPath));
  }

  const timerRelationsLog = startTimer('Bulk save relations');
  const relationRows = buildRelationRows(atomsToSync);
  saveRelationRowsWithRepo(repo, relationRows, allAtoms, absoluteRootPath, logger);
  if (relationRows.length > 0 && verbose) {
    logger.info(`  ✓ Saved ${relationRows.length} atom relations via bulk insert`);
  }

  timerRelationsLog.end(verbose);

  try {
    const db = repo.db || repo.getDatabase?.();
    if (db) {
      persistSqlQueryRelations(db, allAtoms, verbose, logger);
    }
  } catch (sqlRelErr) {
    logger.warn(`  ⚠️ executes_sql relation save failed: ${sqlRelErr.message}`);
  }

  if (verbose) {
    logger.info(`  ✓ Saved ${relationRows.length} atom relations\n`);
  }
}

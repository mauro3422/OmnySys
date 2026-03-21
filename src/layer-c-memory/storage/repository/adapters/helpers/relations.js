/**
 * @fileoverview relations.js
 * 
 * Gestión de relaciones entre átomos (calls, dependencies).
 * 
 * @module storage/repository/adapters/helpers/relations
 */

import { safeNumber, safeJson } from './converters.js';
import { BaseSqlRepository } from '#layer-c/storage/repository/core/BaseSqlRepository.js';
import { primeActiveAtomCache, resolveCallTargetId } from './call-target-resolver.js';
import { buildCanonicalAtomIdVariants, normalizeCanonicalAtomId } from './canonical-atom-id.js';

function createResolverCache(db) {
  const resolverCache = {
    importsBySourcePath: new Map(),
    resolvedTargets: new Map()
  };
  primeActiveAtomCache(db, resolverCache);
  return resolverCache;
}

function deleteCallRelationsForAtom(db, atomId, label) {
  const hr = new BaseSqlRepository(db, label);
  for (const sourceId of buildCanonicalAtomIdVariants(atomId)) {
    hr.delete('atom_relations', 'source_id', sourceId);
  }
}

function serializeCallContext(call, atomId, logger) {
  try {
    return JSON.stringify(call && typeof call === 'object' ? call : {});
  } catch (e) {
    logger.warn(`[SQLiteAdapter] Failed to stringify call context for ${atomId}: ${e.message}`);
    return '{}';
  }
}

function insertResolvedCall(db, insertStmt, normalizedSourceId, call, atomId, logger, now, resolverCache, projectPath = null) {
  const normalizeIdFn = projectPath
    ? (id) => normalizeCanonicalAtomId(id, projectPath)
    : normalizeCanonicalAtomId;
  const targetId = resolveCallTargetId(db, normalizedSourceId, call, normalizeIdFn, resolverCache);
  if (!targetId) {
    return null;
  }

  const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
  const lineNumber = typeof call?.line === 'number' ? call.line : null;
  const contextJson = serializeCallContext(call, atomId, logger);

  insertStmt.run(normalizedSourceId, targetId, weight, lineNumber, contextJson, now, now);
  return targetId;
}

function groupCallsByAtomId(relations) {
  const atomsWithCalls = new Map();

  for (const { atomId, call } of relations) {
    if (!atomsWithCalls.has(atomId)) {
      atomsWithCalls.set(atomId, []);
    }
    atomsWithCalls.get(atomId).push(call);
  }

  return atomsWithCalls;
}

export function loadCallTargetIdsForSources(db, sourceIds = []) {
  const normalizedSourceIds = [...new Set(
    (Array.isArray(sourceIds) ? sourceIds : [])
      .map((value) => normalizeCanonicalAtomId(value))
      .filter(Boolean)
  )];

  if (normalizedSourceIds.length === 0) {
    return [];
  }

  const placeholders = normalizedSourceIds.map(() => '?').join(', ');
  const rows = db.prepare(`
    SELECT DISTINCT target_id
    FROM atom_relations
    WHERE relation_type = 'calls'
      AND (is_removed IS NULL OR is_removed = 0)
      AND source_id IN (${placeholders})
  `).all(...normalizedSourceIds);

  return rows.map((row) => row.target_id).filter(Boolean);
}

function loadCallersForTargets(db, targetIds = []) {
  const normalizedTargetIds = [...new Set(
    (Array.isArray(targetIds) ? targetIds : [])
      .map((value) => normalizeCanonicalAtomId(value))
      .filter(Boolean)
  )];

  if (normalizedTargetIds.length === 0) {
    return new Map();
  }

  const placeholders = normalizedTargetIds.map(() => '?').join(', ');
  const rows = db.prepare(`
    SELECT r.target_id, a.id, a.name, a.file_path, r.weight, r.line_number
    FROM atom_relations r
    JOIN atoms a ON r.source_id = a.id
    WHERE r.relation_type = 'calls'
      AND (r.is_removed IS NULL OR r.is_removed = 0)
      AND (a.is_removed IS NULL OR a.is_removed = 0)
      AND r.target_id IN (${placeholders})
    ORDER BY r.target_id, a.name, a.file_path
  `).all(...normalizedTargetIds);

  const callersByTarget = new Map();
  for (const row of rows || []) {
    if (!row?.target_id) {
      continue;
    }

    const targetId = String(row.target_id);
    const callers = callersByTarget.get(targetId) || [];
    callers.push({
      id: row.id,
      name: row.name,
      file: row.file_path,
      weight: row.weight,
      line: row.line_number
    });
    callersByTarget.set(targetId, callers);
  }

  return callersByTarget;
}

export function syncCalledByReferences(db, targetIds = [], logger = null) {
  const normalizedTargetIds = [...new Set(
    (Array.isArray(targetIds) ? targetIds : [])
      .map((value) => normalizeCanonicalAtomId(value))
      .filter(Boolean)
  )];

  if (normalizedTargetIds.length === 0) {
    return 0;
  }

  const callersByTarget = loadCallersForTargets(db, normalizedTargetIds);
  const now = new Date().toISOString();
  const updateStmt = db.prepare(`
    UPDATE atoms
    SET called_by_json = ?, updated_at = ?
    WHERE id = ?
  `);

  try {
    const transaction = db.transaction(() => {
      for (const targetId of normalizedTargetIds) {
        const callers = callersByTarget.get(targetId) || [];
        updateStmt.run(safeJson(callers), now, targetId);
      }
    });

    transaction();
    return normalizedTargetIds.length;
  } catch (error) {
    if (logger?.warn) {
      logger.warn(`[SQLiteAdapter] Failed to sync called_by_json references: ${error.message}`);
    }
    return 0;
  }
}

/**
 * Guarda las llamadas (calls) de un átomo
 */
export function saveCalls(db, atomId, calls, logger) {
  const now = new Date().toISOString();
  const normalizeIdFn = normalizeCanonicalAtomId;
  const normalizedSourceId = normalizeIdFn(atomId);
  const previousTargetIds = loadCallTargetIdsForSources(db, [normalizedSourceId]);
  const affectedTargetIds = new Set(previousTargetIds);

  // Primero borrar relaciones existentes
  deleteCallRelationsForAtom(db, atomId, 'Relations');

  if (!calls || calls.length === 0) {
    syncCalledByReferences(db, previousTargetIds, logger);
    return;
  }

  // Insertar nuevas relaciones
  const insertStmt = db.prepare(`
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
  const resolverCache = createResolverCache(db);

  for (const call of calls) {
    const targetId = insertResolvedCall(db, insertStmt, normalizedSourceId, call, atomId, logger, now, resolverCache);
    if (targetId) {
      affectedTargetIds.add(targetId);
    }
  }

  syncCalledByReferences(db, [...affectedTargetIds], logger);
}

/**
 * Guarda un batch de relaciones de forma eficiente
 * Este método asume que todos los átomos ya existen en la BD
 */
export function saveRelationsBatch(db, connectionManager, relations, logger) {
  if (!relations || relations.length === 0) return;

  const now = new Date().toISOString();
  const atomsWithCalls = groupCallsByAtomId(relations);
  const sourceIds = [...atomsWithCalls.keys()].map((atomId) => normalizeCanonicalAtomId(atomId));
  const previousTargetIds = loadCallTargetIdsForSources(db, sourceIds);
  const affectedTargetIds = new Set(previousTargetIds);

  const insertStmt = db.prepare(`
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
  const resolverCache = createResolverCache(db);

  // Usar transaccion para todo el batch
  connectionManager.transaction(() => {
    for (const [atomId, calls] of atomsWithCalls) {
      // Borrar relaciones existentes para este atom usando el helper central
      const normalizedSourceId = normalizeCanonicalAtomId(atomId);
      deleteCallRelationsForAtom(db, atomId, 'RelationsBatch');

      // Insertar nuevas relaciones
      for (const call of calls) {
        const targetId = insertResolvedCall(db, insertStmt, normalizedSourceId, call, atomId, logger, now, resolverCache);
        if (targetId) {
          affectedTargetIds.add(targetId);
        }
      }
    }
  });

  syncCalledByReferences(db, [...affectedTargetIds], logger);
  logger.debug(`[SQLiteAdapter] Batch saved ${relations.length} relations for ${atomsWithCalls.size} atoms`);
}

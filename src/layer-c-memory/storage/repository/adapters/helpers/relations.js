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
    return;
  }

  const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
  const lineNumber = typeof call?.line === 'number' ? call.line : null;
  const contextJson = serializeCallContext(call, atomId, logger);

  insertStmt.run(normalizedSourceId, targetId, weight, lineNumber, contextJson, now, now);
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

/**
 * Guarda las llamadas (calls) de un átomo
 */
export function saveCalls(db, atomId, calls, logger) {
  const now = new Date().toISOString();
  const normalizeIdFn = normalizeCanonicalAtomId;

  // Primero borrar relaciones existentes
  deleteCallRelationsForAtom(db, atomId, 'Relations');

  if (!calls || calls.length === 0) return;

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
    const normalizedSourceId = normalizeIdFn(atomId);
    insertResolvedCall(db, insertStmt, normalizedSourceId, call, atomId, logger, now, resolverCache);
  }
}

/**
 * Guarda un batch de relaciones de forma eficiente
 * Este método asume que todos los átomos ya existen en la BD
 */
export function saveRelationsBatch(db, connectionManager, relations, logger) {
  if (!relations || relations.length === 0) return;

  const now = new Date().toISOString();
  const atomsWithCalls = groupCallsByAtomId(relations);

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
        insertResolvedCall(db, insertStmt, normalizedSourceId, call, atomId, logger, now, resolverCache);
      }
    }
  });

  logger.debug(`[SQLiteAdapter] Batch saved ${relations.length} relations for ${atomsWithCalls.size} atoms`);
}

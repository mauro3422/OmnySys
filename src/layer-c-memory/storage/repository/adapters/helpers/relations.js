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

/**
 * Guarda las llamadas (calls) de un átomo
 */
export function saveCalls(db, atomId, calls, logger) {
  const now = new Date().toISOString();
  const normalizeIdFn = (id) => {
    if (!id || !id.includes('::')) {
      return id;
    }

    const [pathPart, namePart] = id.split('::');
    return `${String(pathPart || '').replace(/\\/g, '/')}::${namePart}`;
  };

  // Primero borrar relaciones existentes
  const hr = new BaseSqlRepository(db, 'Relations');
  hr.delete('atom_relations', 'source_id', normalizeIdFn(atomId)); // Reemplaza prepared stmt manual duplicado

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
  const resolverCache = {
    importsBySourcePath: new Map(),
    resolvedTargets: new Map()
  };
  primeActiveAtomCache(db, resolverCache);

  for (const call of calls) {
    const normalizedSourceId = normalizeIdFn(atomId);
    const targetId = resolveCallTargetId(db, normalizedSourceId, call, normalizeIdFn, resolverCache);
    if (!targetId) {
      continue;
    }

    // Asegurar que los valores son del tipo correcto para SQLite
    const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
    const lineNumber = typeof call?.line === 'number' ? call.line : null;

    // Serializar el contexto de forma segura
    let contextJson = '{}';
    try {
      contextJson = JSON.stringify(call && typeof call === 'object' ? call : {});
    } catch (e) {
      logger.warn(`[SQLiteAdapter] Failed to stringify call context for ${atomId}: ${e.message}`);
      contextJson = '{}';
    }

    insertStmt.run(normalizedSourceId, targetId, weight, lineNumber, contextJson, now, now);
  }
}

/**
 * Guarda un batch de relaciones de forma eficiente
 * Este método asume que todos los átomos ya existen en la BD
 */
export function saveRelationsBatch(db, connectionManager, relations, logger) {
  if (!relations || relations.length === 0) return;

  const now = new Date().toISOString();

  // Agrupar por atomId para hacer DELETE por batch
  const atomsWithCalls = new Map();
  for (const { atomId, call } of relations) {
    if (!atomsWithCalls.has(atomId)) {
      atomsWithCalls.set(atomId, []);
    }
    atomsWithCalls.get(atomId).push(call);
  }

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
  const resolverCache = {
    importsBySourcePath: new Map(),
    resolvedTargets: new Map()
  };
  primeActiveAtomCache(db, resolverCache);

  // Usar transaccion para todo el batch
  connectionManager.transaction(() => {
    for (const [atomId, calls] of atomsWithCalls) {
      // Borrar relaciones existentes para este atom usando el helper central
      const hr = new BaseSqlRepository(db, 'RelationsBatch');
      const normalizedSourceId = atomId.includes('::')
        ? `${atomId.split('::')[0].replace(/\\/g, '/')}::${atomId.split('::').slice(1).join('::')}`
        : atomId;
      hr.delete('atom_relations', 'source_id', normalizedSourceId);

      // Insertar nuevas relaciones
      for (const call of calls) {
        const targetId = resolveCallTargetId(db, normalizedSourceId, call, (id) => {
          if (!id || !id.includes('::')) {
            return id;
          }
          const [pathPart, namePart] = id.split('::');
          return `${String(pathPart || '').replace(/\\/g, '/')}::${namePart}`;
        }, resolverCache);
        if (!targetId) {
          continue;
        }

        const weight = typeof call?.weight === 'number' ? call.weight : 1.0;
        const lineNumber = typeof call?.line === 'number' ? call.line : null;

        let contextJson = '{}';
        try {
          contextJson = JSON.stringify(call && typeof call === 'object' ? call : {});
        } catch (e) {
          contextJson = '{}';
        }

        insertStmt.run(normalizedSourceId, targetId, weight, lineNumber, contextJson, now, now);
      }
    }
  });

  logger.debug(`[SQLiteAdapter] Batch saved ${relations.length} relations for ${atomsWithCalls.size} atoms`);
}

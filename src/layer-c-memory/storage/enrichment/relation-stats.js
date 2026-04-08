/**
 * @fileoverview Relation statistics for atoms.
 * @module storage/enrichment/relation-stats
 */

import { createLogger } from '../../../utils/logger.js';
import { connectionManager } from '../database/connection.js';
import { getRepository } from '../repository/index.js';
import { isTransientSqliteAvailabilityError } from './graph-algebra.js';

const logger = createLogger('OmnySys:storage:enrichment');

/**
 * Obtiene estadísticas de relaciones para un conjunto de átomos.
 *
 * @param {string[]} atomIds - Lista de IDs
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Map>} Mapa de estadísticas por ID
 */
export async function getRelationStats(atomIds, projectPath) {
  if (!atomIds || atomIds.length === 0) return new Map();

  try {
    if (!connectionManager.isInitialized()) return new Map();
    const repo = getRepository(projectPath);
    if (!repo?.initialized || !repo?.db || repo.db.open === false) return new Map();

    const placeholders = atomIds.map(() => '?').join(',');

    const callersQuery = `
      SELECT target_id as atom_id, COUNT(DISTINCT source_id) as caller_count
      FROM atom_relations
      WHERE relation_type = 'calls' AND target_id IN (${placeholders})
      GROUP BY target_id
    `;

    const calleesQuery = `
      SELECT source_id as atom_id, COUNT(DISTINCT target_id) as callee_count
      FROM atom_relations
      WHERE relation_type = 'calls' AND source_id IN (${placeholders})
      GROUP BY source_id
    `;

    const callers = repo.db.prepare(callersQuery).all(...atomIds);
    const callees = repo.db.prepare(calleesQuery).all(...atomIds);

    const statsMap = new Map();

    for (const id of atomIds) {
      statsMap.set(id, { callerCount: 0, calleeCount: 0 });
    }

    for (const r of callers) {
      const current = statsMap.get(r.atom_id) || { callerCount: 0, calleeCount: 0 };
      current.callerCount = r.caller_count;
      statsMap.set(r.atom_id, current);
    }

    for (const r of callees) {
      const current = statsMap.get(r.atom_id) || { callerCount: 0, calleeCount: 0 };
      current.calleeCount = r.callee_count;
      statsMap.set(r.atom_id, current);
    }

    return statsMap;

  } catch (err) {
    if (isTransientSqliteAvailabilityError(err)) {
      logger.debug(`[getRelationStats] Skipping transient SQLite issue: ${err.message}`);
      return new Map();
    }

    logger.error('[getRelationStats] Error:', err.message);
    return new Map();
  }
}

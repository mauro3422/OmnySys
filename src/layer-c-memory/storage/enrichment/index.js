/**
 * @fileoverview enrichment.js
 *
 * Módulo estándar para enriquecer átomos con relaciones.
 * PROPÓSITO: Proporcionar una forma eficiente de cargar relaciones
 * solo para los átomos que se necesitan, sin cargar todo el sistema.
 *
 * Este es el ESTÁNDAR para todas las tools que necesitan relaciones.
 *
 * @module storage/enrichment
 */

import { getRepository } from '../repository/index.js';

/**
 * Opciones de enrichment
 * @typedef {Object} EnrichmentOptions
 * @property {string} [scope] - 'file', 'id', 'ids', 'all'
 * @property {string} [filePath] - Ruta del archivo (para scope='file')
 * @property {string} [id] - ID único del átomo (para scope='id')
 * @property {string[]} [ids] - Lista de IDs (para scope='ids')
 * @property {boolean} [withCallers] - Incluir lista de callers
 * @property {boolean} [withCallees] - Incluir lista de callees
 * @property {boolean} [withStats] - Incluir estadísticas (caller count, etc)
 */

/**
 * Enriquece átomos con sus relaciones de forma eficiente.
 *
 * FUNCIONAMIENTO:
 * - Por defecto carga solo estadísticas (counts) - rápido
 * - Con withCallers/withCallees carga las listas completas
 * - Soporta enrichment por archivo, por ID, o por lista de IDs
 *
 * @param {Array|Object} atoms - Átomo(s) a enriquecer
 * @param {EnrichmentOptions} options - Opciones de enrichment
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Array|Object>} Átomo(s) enriquecido(s)
 */
export async function enrichAtomsWithRelations(atoms, options = {}, projectPath) {
  if (!atoms || (Array.isArray(atoms) && atoms.length === 0)) return atoms;

  const {
    scope = 'all',
    filePath,
    id,
    ids,
    withCallers = false,
    withCallees = false,
    withStats = true
  } = options;

  const isSingleAtom = !Array.isArray(atoms);
  const atomsArray = isSingleAtom ? [atoms] : atoms;

  try {
    const repo = getRepository(projectPath);
    if (!repo || !repo.db) {
      console.warn('[enrichAtomsWithRelations] No repository available');
      return atoms;
    }

    const atomIds = atomsArray.map(a => a.id);

    let relationQuery = '';
    let queryParams = [];

    if (scope === 'file' && filePath) {
      relationQuery = `
        SELECT ar.*
        FROM atom_relations ar
        JOIN atoms a ON ar.source_id = a.id
        WHERE a.file_path = ?
      `;
      queryParams = [filePath];
    } else if (scope === 'id' && id) {
      relationQuery = `
        SELECT * FROM atom_relations
        WHERE source_id = ? OR target_id = ?
      `;
      queryParams = [id, id];
    } else if (scope === 'ids' && ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      relationQuery = `
        SELECT * FROM atom_relations
        WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})
      `;
      queryParams = [...ids, ...ids];
    } else {
      const placeholders = atomIds.map(() => '?').join(',');
      relationQuery = `
        SELECT * FROM atom_relations
        WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})
      `;
      queryParams = [...atomIds, ...atomIds];
    }

    const relations = repo.db.prepare(relationQuery).all(...queryParams);

    const callersMap = new Map();
    const calleesMap = new Map();

    for (const rel of relations) {
      if (!callersMap.has(rel.target_id)) {
        callersMap.set(rel.target_id, new Set());
      }
      if (!calleesMap.has(rel.source_id)) {
        calleesMap.set(rel.source_id, new Set());
      }
      callersMap.get(rel.target_id).add(rel.source_id);
      calleesMap.get(rel.source_id).add(rel.target_id);
    }

    const enrichedAtoms = atomsArray.map(atom => {
      const enriched = { ...atom };

      if (withStats) {
        enriched.callerCount = callersMap.get(atom.id)?.size || 0;
        enriched.calleeCount = calleesMap.get(atom.id)?.size || 0;
      }

      if (withCallers) {
        enriched.callers = Array.from(callersMap.get(atom.id) || []);
      }

      if (withCallees) {
        enriched.callees = Array.from(calleesMap.get(atom.id) || []);
      }

      return enriched;
    });

    return isSingleAtom ? enrichedAtoms[0] : enrichedAtoms;

  } catch (err) {
    console.error('[enrichAtomsWithRelations] Error:', err.message);
    return atoms;
  }
}

/**
 * Enriquece átomos con relaciones optimizado para un archivo específico.
 *
 * @param {Array} atoms - Átomos del archivo
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Array>} Átomos enriquecidos
 */
export async function enrichAtomsForFile(atoms, projectPath) {
  return enrichAtomsWithRelations(atoms, {
    scope: 'all',
    withStats: true,
    withCallers: false,
    withCallees: false
  }, projectPath);
}

/**
 * Enriquece un átomo específico con todas sus relaciones.
 *
 * @param {Object} atom - Átomo a enriquecer
 * @param {string} projectPath - Ruta del proyecto
 * @returns {Promise<Object>} Átomo enriquecido
 */
export async function enrichAtomWithFullRelations(atom, projectPath) {
  if (!atom || !atom.id) return atom;

  return enrichAtomsWithRelations(atom, {
    scope: 'id',
    id: atom.id,
    withStats: true,
    withCallers: true,
    withCallees: true
  }, projectPath);
}

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
    const repo = getRepository(projectPath);
    if (!repo || !repo.db) return new Map();

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
    console.error('[getRelationStats] Error:', err.message);
    return new Map();
  }
}

export default {
  enrichAtomsWithRelations,
  enrichAtomsForFile,
  enrichAtomWithFullRelations,
  getRelationStats
};

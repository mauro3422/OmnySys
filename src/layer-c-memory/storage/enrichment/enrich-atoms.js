/**
 * @fileoverview Main enrichment engine - enriches atoms with graph relations.
 * @module storage/enrichment/enrich-atoms
 */

import { createLogger } from '../../../utils/logger.js';
import { connectionManager } from '../database/connection.js';
import { getRepository } from '../repository/index.js';
import {
  calculateStructuralCentrality,
  calculatePropagationScore,
  predictBreakingRisk,
  isTransientSqliteAvailabilityError
} from './graph-algebra.js';

const logger = createLogger('OmnySys:storage:enrichment');

function buildRelationSelection({ scope, filePath, id, ids, atomIds }) {
  if (scope === 'file' && filePath) {
    return {
      query: `
        SELECT ar.*
        FROM atom_relations ar
        JOIN atoms a ON ar.source_id = a.id
        WHERE a.file_path = ?
      `,
      params: [filePath]
    };
  }

  if (scope === 'id' && id) {
    return {
      query: `
        SELECT * FROM atom_relations
        WHERE source_id = ? OR target_id = ?
      `,
      params: [id, id]
    };
  }

  if (scope === 'ids' && ids && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    return {
      query: `
        SELECT * FROM atom_relations
        WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})
      `,
      params: [...ids, ...ids]
    };
  }

  if (!atomIds.length) {
    return null;
  }

  const placeholders = atomIds.map(() => '?').join(',');
  return {
    query: `
      SELECT * FROM atom_relations
      WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})
    `,
    params: [...atomIds, ...atomIds]
  };
}

function buildRelationMaps(relations) {
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

  return { callersMap, calleesMap };
}

function enrichAtomRecord(atom, callersMap, calleesMap, { withStats, withCallers, withCallees }) {
  const enriched = { ...atom };
  const inDegree = callersMap.get(atom.id)?.size || 0;
  const outDegree = calleesMap.get(atom.id)?.size || 0;

  if (withStats) {
    enriched.callerCount = inDegree;
    enriched.calleeCount = outDegree;
  }

  if (withCallers) {
    enriched.callers = Array.from(callersMap.get(atom.id) || []);
  }

  if (withCallees) {
    enriched.callees = Array.from(calleesMap.get(atom.id) || []);
  }

  const centrality = calculateStructuralCentrality(inDegree, outDegree);
  const propagation = calculatePropagationScore(inDegree, outDegree);
  const risk = predictBreakingRisk(centrality, atom.fragility_score || 0.3);

  enriched.graph = {
    centrality: centrality.centrality,
    centralityClassification: centrality.classification,
    inDegree: centrality.inDegree,
    outDegree: centrality.outDegree,
    propagationScore: propagation.propagationScore,
    propagationLevel: propagation.impactLevel,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    riskPrediction: risk.prediction
  };

  return enriched;
}

/**
 * Enriquece átomos con relaciones de forma eficiente.
 *
 * FUNCIONAMIENTO:
 * - Por defecto carga solo estadísticas (counts) - rápido
 * - Con withCallers/withCallees carga las listas completas
 * - YA CALCULA: centrality, propagation, risk - determinista
 *
 * @param {Array|Object} atoms - Átomo(s) a enriquecer
 * @param {Object} options - Opciones de enrichment
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
    if (!connectionManager.isInitialized()) {
      return atoms;
    }
    const repo = getRepository(projectPath);
    if (!repo?.initialized || !repo?.db || repo.db.open === false) {
      logger.debug('[enrichAtomsWithRelations] No repository available');
      return atoms;
    }

    const atomIds = atomsArray.map(a => a.id);
    const relationSelection = buildRelationSelection({ scope, filePath, id, ids, atomIds });
    if (!relationSelection) {
      return atoms;
    }

    const relations = repo.db.prepare(relationSelection.query).all(...relationSelection.params);
    const { callersMap, calleesMap } = buildRelationMaps(relations);
    const enrichedAtoms = atomsArray.map((atom) => enrichAtomRecord(atom, callersMap, calleesMap, {
      withStats,
      withCallers,
      withCallees
    }));

    return isSingleAtom ? enrichedAtoms[0] : enrichedAtoms;

  } catch (err) {
    if (isTransientSqliteAvailabilityError(err)) {
      logger.debug(`[enrichAtomsWithRelations] Skipping transient SQLite issue: ${err.message}`);
      return atoms;
    }

    logger.error('[enrichAtomsWithRelations] Error:', err.message);
    return atoms;
  }
}

/**
 * Enriquece átomos con relaciones optimizado para un archivo específico.
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

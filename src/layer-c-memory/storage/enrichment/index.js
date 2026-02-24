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
 * Calcula centralidad (PageRank-like) basado en grado de entrada/salida
 * @param {number} inDegree - Número de callers
 * @param {number} outDegree - Número de callees
 * @returns {Object} { centrality, classification }
 */
function calculateCentrality(inDegree, outDegree) {
  const centrality = inDegree / (outDegree + 1);
  let classification = 'LEAF';
  if (centrality > 10) classification = 'HUB';
  else if (centrality > 2) classification = 'BRIDGE';
  
  return {
    centrality: parseFloat(centrality.toFixed(3)),
    classification,
    inDegree,
    outDegree
  };
}

/**
 * Calcula score de propagación - qué tanto se afecta el grafo si este átomo cambia
 * @param {number} inDegree - Número de atoms que dependen de este
 * @param {number} outDegree - Número de atoms que este usa
 * @returns {Object} { propagationScore, impactLevel }
 */
function calculatePropagationScore(inDegree, outDegree) {
  const score = (inDegree * 0.6) + (outDegree * 0.4);
  const impactLevel = score > 10 ? 'HIGH' : score > 5 ? 'MEDIUM' : 'LOW';
  
  return {
    propagationScore: parseFloat(score.toFixed(3)),
    impactLevel
  };
}

/**
 * Predice riesgo de breaking changes basado en centralidad
 * @param {Object} centrality - Resultado de calculateCentrality
 * @param {number} fragilityScore - Score de fragilidad del átomo (0-1)
 * @returns {Object} { riskScore, riskLevel, prediction }
 */
function predictBreakingRisk(centrality, fragilityScore = 0.3) {
  const riskScore = (centrality.inDegree * 0.5) + (centrality.outDegree * 0.3) + (fragilityScore * 0.2);
  let riskLevel = 'LOW';
  let prediction = 'Cambios seguros';
  
  if (riskScore > 0.7) {
    riskLevel = 'HIGH';
    prediction = 'Alto riesgo: muchos dependents';
  } else if (riskScore > 0.4) {
    riskLevel = 'MEDIUM';
    prediction = 'Riesgo moderado';
  }
  
  return {
    riskScore: parseFloat(riskScore.toFixed(3)),
    riskLevel,
    prediction
  };
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

      // ÁLGEBRA DE GRAFOS: Calcular centrality, propagation y risk automáticamente
      const centrality = calculateCentrality(inDegree, outDegree);
      const propagation = calculatePropagationScore(inDegree, outDegree);
      const risk = predictBreakingRisk(centrality, atom.fragility_score || 0.3);
      
      // Agregar valores derivados al átomo enriquecido
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

/**
 * Persiste los datos del grafo en la tabla atoms.
 * Calcula centrality, propagation, risk y guarda en la DB.
 * 
 * @param {string} projectPath - Ruta del proyecto
 * @param {string[]} atomIds - Lista de átomos a actualizar (opcional, todos si no se especifica)
 */
export async function persistGraphMetrics(projectPath, atomIds = null) {
  try {
    const repo = getRepository(projectPath);
    if (!repo || !repo.db) {
      console.warn('[persistGraphMetrics] No repo available');
      return;
    }

    let atomsToUpdate;
    if (atomIds && atomIds.length > 0) {
      // Actualizar solo los átomos especificados
      const placeholders = atomIds.map(() => '?').join(',');
      atomsToUpdate = repo.db.prepare(`
        SELECT id FROM atoms WHERE id IN (${placeholders})
      `).all(...atomIds).map(a => a.id);
    } else {
      // Actualizar todos los átomos
      atomsToUpdate = repo.db.prepare(`SELECT id FROM atoms`).all().map(a => a.id);
    }

    // Obtener estadísticas de relaciones
    const statsMap = await getRelationStats(atomsToUpdate, projectPath);

    // Calcular y persistir métricas
    for (const atomId of atomsToUpdate) {
      const stats = statsMap.get(atomId) || { callerCount: 0, calleeCount: 0 };
      const inDegree = stats.callerCount;
      const outDegree = stats.calleeCount;

      // Calcular usando las funciones de algebra de grafos
      const centrality = calculateCentrality(inDegree, outDegree);
      const propagation = calculatePropagationScore(inDegree, outDegree);
      const risk = predictBreakingRisk(centrality, 0.3);

      // Actualizar en la base de datos
      repo.db.prepare(`
        UPDATE atoms SET 
          in_degree = ?,
          out_degree = ?,
          centrality_score = ?,
          centrality_classification = ?,
          propagation_score = ?,
          risk_level = ?,
          risk_prediction = ?
        WHERE id = ?
      `).run(
        inDegree,
        outDegree,
        centrality.centrality,
        centrality.classification,
        propagation.propagationScore,
        risk.riskLevel,
        risk.prediction,
        atomId
      );
    }

    console.log(`[persistGraphMetrics] Updated ${atomsToUpdate.length} atoms with graph metrics`);

  } catch (err) {
    console.error('[persistGraphMetrics] Error:', err.message);
  }
}

export default {
  enrichAtomsWithRelations,
  enrichAtomsForFile,
  enrichAtomWithFullRelations,
  getRelationStats,
  persistGraphMetrics
};

/**
 * @fileoverview Persists graph metrics to database.
 * @module storage/enrichment/persist-graph-metrics
 */

import { createLogger } from '../../../utils/logger.js';
import { connectionManager } from '../database/connection.js';
import { getRepository } from '../repository/index.js';
import { rowToAtom } from '../repository/adapters/helpers/converters.js';
import { calculateAtomVectors } from '../repository/utils/vector-calculator.js';
import {
  getStoredGraphCounts,
  buildSyntheticRelations,
  calculateStructuralCentrality,
  calculatePropagationScore,
  predictBreakingRisk,
  isTransientSqliteAvailabilityError
} from './graph-algebra.js';

const logger = createLogger('OmnySys:storage:enrichment');

function loadAtomsForGraphMetrics(repo, atomIds) {
  if (atomIds && atomIds.length > 0) {
    const placeholders = atomIds.map(() => '?').join(',');
    return repo.db.prepare(`
      SELECT *
      FROM atoms
      WHERE id IN (${placeholders})
    `).all(...atomIds);
  }

  return repo.db.prepare(`
    SELECT *
    FROM atoms
  `).all();
}

function buildGraphMetricPayload(atomRow) {
  const { inDegree, outDegree } = getStoredGraphCounts(atomRow);
  const atom = rowToAtom(atomRow);
  const vectors = calculateAtomVectors(
    {
      ...atom,
      inDegree,
      outDegree,
      callersCount: inDegree,
      calleesCount: outDegree,
      externalCallCount: atom.externalCallCount || atom.external_call_count || 0
    },
    {
      callers: buildSyntheticRelations(inDegree),
      callees: buildSyntheticRelations(outDegree),
      gitHistory: {
        changeFrequency: atom.changeFrequency || atom.change_frequency || 0,
        ageDays: atom.ageDays || atom.age_days || 0
      }
    }
  );

  const centrality = calculateStructuralCentrality(inDegree, outDegree);
  const propagation = calculatePropagationScore(inDegree, outDegree);
  const fragilityScore = vectors.fragilityScore ?? atom.fragilityScore ?? atomRow.fragility_score ?? 0;
  const risk = predictBreakingRisk(centrality, fragilityScore);

  return {
    inDegree,
    outDegree,
    importance: vectors.importance ?? atom.importanceScore ?? atomRow.importance_score ?? 0,
    couplingScore: vectors.couplingScore ?? atom.couplingScore ?? atomRow.coupling_score ?? 0,
    cohesionScore: vectors.cohesionScore ?? atom.cohesionScore ?? atomRow.cohesion_score ?? 0,
    stabilityScore: vectors.stability ?? atom.stabilityScore ?? atomRow.stability_score ?? 1,
    centrality: centrality.centrality,
    classification: centrality.classification,
    propagationScore: propagation.propagationScore,
    fragilityScore,
    testabilityScore: vectors.testabilityScore ?? atom.testabilityScore ?? atomRow.testability_score ?? 0,
    riskLevel: risk.riskLevel,
    prediction: risk.prediction
  };
}

function persistGraphMetricsRows(repo, atomsToUpdate) {
  const updateAtomMetrics = repo.db.prepare(`
    UPDATE atoms SET
      in_degree = ?,
      out_degree = ?,
      importance_score = ?,
      coupling_score = ?,
      cohesion_score = ?,
      stability_score = ?,
      centrality_score = ?,
      centrality_classification = ?,
      propagation_score = ?,
      fragility_score = ?,
      testability_score = ?,
      risk_level = ?,
      risk_prediction = ?
    WHERE id = ?
  `);

  const applyBatch = repo.db.transaction((rows) => {
    for (const atomRow of rows) {
      const metrics = buildGraphMetricPayload(atomRow);
      updateAtomMetrics.run(
        metrics.inDegree,
        metrics.outDegree,
        metrics.importance,
        metrics.couplingScore,
        metrics.cohesionScore,
        metrics.stabilityScore,
        metrics.centrality,
        metrics.classification,
        metrics.propagationScore,
        metrics.fragilityScore,
        metrics.testabilityScore,
        metrics.riskLevel,
        metrics.prediction,
        atomRow.id
      );
    }
  });

  applyBatch(atomsToUpdate);
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
    if (!connectionManager.isInitialized()) {
      logger.debug('[persistGraphMetrics] No repo available');
      return;
    }
    const repo = getRepository(projectPath);
    if (!repo?.initialized || !repo?.db || repo.db.open === false) {
      logger.debug('[persistGraphMetrics] No repo available');
      return;
    }

    const atomsToUpdate = loadAtomsForGraphMetrics(repo, atomIds);
    persistGraphMetricsRows(repo, atomsToUpdate);
    logger.debug(`[persistGraphMetrics] Updated ${atomsToUpdate.length} atoms with graph metrics`);

  } catch (err) {
    if (isTransientSqliteAvailabilityError(err)) {
      logger.debug(`[persistGraphMetrics] Skipping transient SQLite issue: ${err.message}`);
      return;
    }

    logger.error('[persistGraphMetrics] Error:', err.message);
  }
}

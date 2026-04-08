/**
 * @fileoverview Graph algebra utilities - pure functions for graph metrics calculation.
 * @module storage/enrichment/graph-algebra
 */

/**
 * Calcula centralidad estructural (PageRank-like) basado en grado de entrada/salida.
 * @param {number} inDegree - Número de callers
 * @param {number} outDegree - Número de callees
 * @returns {Object} { centrality, classification, inDegree, outDegree }
 */
export function calculateStructuralCentrality(inDegree, outDegree) {
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

export function getStoredGraphCounts(atomRow = {}) {
  const inDegree = Math.max(
    Number(atomRow.callers_count) || 0,
    Number(atomRow.callerCount) || 0,
    Number(atomRow.in_degree) || 0,
    Number(atomRow.inDegree) || 0
  );

  const outDegree = Math.max(
    Number(atomRow.callees_count) || 0,
    Number(atomRow.calleeCount) || 0,
    Number(atomRow.out_degree) || 0,
    Number(atomRow.outDegree) || 0
  );

  return { inDegree, outDegree };
}

export function buildSyntheticRelations(count) {
  const safeCount = Math.max(0, Number(count) || 0);
  return Array.from({ length: safeCount }, (_, index) => `__synthetic_${index}`);
}

export function isTransientSqliteAvailabilityError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'SQLITE_BUSY' ||
    error?.code === 'SQLITE_LOCKED' ||
    message.includes('database connection is not open') ||
    message.includes('database is locked') ||
    message.includes('database is busy')
  );
}

/**
 * Calcula score de propagación - qué tanto se afecta el grafo si este átomo cambia
 * @param {number} inDegree - Número de atoms que dependen de este
 * @param {number} outDegree - Número de atoms que este usa
 * @returns {Object} { propagationScore, impactLevel }
 */
export function calculatePropagationScore(inDegree, outDegree) {
  const normalizedIn = Math.min(inDegree / 10, 1);
  const normalizedOut = Math.min(outDegree / 10, 1);
  const score = (normalizedIn * 0.6) + (normalizedOut * 0.4);
  const impactLevel = score > 0.7 ? 'HIGH' : score > 0.4 ? 'MEDIUM' : 'LOW';

  return {
    propagationScore: parseFloat(score.toFixed(3)),
    impactLevel
  };
}

/**
 * Predice riesgo de breaking changes basado en centralidad estructural.
 * @param {Object} centrality - Resultado de calculateStructuralCentrality
 * @param {number} fragilityScore - Score de fragilidad del átomo (0-1)
 * @returns {Object} { riskScore, riskLevel, prediction }
 */
export function predictBreakingRisk(centrality, fragilityScore = 0.3) {
  const normalizedIn = Math.min(centrality.inDegree / 10, 1);
  const normalizedOut = Math.min(centrality.outDegree / 10, 1);

  const riskScore = (normalizedIn * 0.5) + (normalizedOut * 0.3) + (fragilityScore * 0.2);
  let riskLevel = 'LOW';
  let prediction = 'Cambios seguros';

  if (riskScore > 0.7) {
    riskLevel = 'HIGH';
    prediction = 'Alto riesgo: muchos dependientes + fragilidad';
  } else if (riskScore > 0.4) {
    riskLevel = 'MEDIUM';
    prediction = 'Riesgo moderado: verificar dependientes';
  }

  return {
    riskScore: parseFloat(riskScore.toFixed(3)),
    riskLevel,
    prediction
  };
}

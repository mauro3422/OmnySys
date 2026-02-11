/**
 * Risk Scorer - Calcula risk scores basado en reglas (sin IA)
 *
 * Algoritmo determinístico que calcula:
 * - Static complexity (funciones, imports)
 * - Semantic connections (cantidad y tipo)
 * - Side effects (categorías)
 * - Hotspot risk (ubicación en el grafo)
 *
 * Score final: 0-10 (low to critical)
 *
 * @module risk-scorer
 */

/**
 * Calcula risk score para un archivo
 *
 * @param {object} fileAnalysis - Análisis del archivo (imports, exports, functions)
 * @param {array} semanticConnections - Conexiones semánticas del archivo
 * @param {object} sideEffects - Side effects detectados
 * @param {object} graphMetrics - Métricas del grafo (grado, hotspots, etc.)
 * @returns {object} - { total, breakdown, severity, explanation }
 */
export function calculateRiskScore(
  fileAnalysis = {},
  semanticConnections = [],
  sideEffects = {},
  graphMetrics = {}
) {
  let score = 0;
  const breakdown = {
    staticComplexity: 0,
    semanticConnections: 0,
    sideEffects: 0,
    hotspotRisk: 0,
    couplingRisk: 0
  };

  const explanations = [];

  // 1. STATIC COMPLEXITY (0-3 points)
  // ===================================
  const functionCount = fileAnalysis.functions?.length || 0;
  const importCount = fileAnalysis.imports?.length || 0;
  const exportCount = fileAnalysis.exports?.length || 0;

  if (functionCount >= 20) {
    breakdown.staticComplexity = 3;
    explanations.push(`High function count (${functionCount})`);
  } else if (functionCount >= 10) {
    breakdown.staticComplexity = 2;
    explanations.push(`Medium function count (${functionCount})`);
  } else if (functionCount >= 5) {
    breakdown.staticComplexity = 1;
    explanations.push(`Low function count (${functionCount})`);
  }

  if (importCount >= 20) {
    breakdown.staticComplexity = Math.max(breakdown.staticComplexity, 3);
    explanations.push(`High import count (${importCount})`);
  } else if (importCount >= 10) {
    breakdown.staticComplexity = Math.max(breakdown.staticComplexity, 2);
    explanations.push(`Medium import count (${importCount})`);
  }

  score += breakdown.staticComplexity;

  // 2. SEMANTIC CONNECTIONS (0-3 points)
  // ====================================
  const connectionCount = semanticConnections.length;
  const highSeverityConnections = semanticConnections.filter(
    c => c.severity === 'critical' || c.severity === 'high'
  ).length;

  if (connectionCount >= 8) {
    breakdown.semanticConnections = 3;
    explanations.push(`Multiple semantic connections (${connectionCount})`);
  } else if (connectionCount >= 5) {
    breakdown.semanticConnections = 2;
    explanations.push(`Several semantic connections (${connectionCount})`);
  } else if (connectionCount >= 2) {
    breakdown.semanticConnections = 1;
    explanations.push(`Some semantic connections (${connectionCount})`);
  }

  if (highSeverityConnections > 0) {
    breakdown.semanticConnections = Math.max(breakdown.semanticConnections, 2);
    explanations.push(`High severity connections (${highSeverityConnections})`);
  }

  score += breakdown.semanticConnections;

  // 3. SIDE EFFECTS (0-3 points)
  // ===========================
  const sideEffectCount = Object.values(sideEffects).filter(Boolean).length || 0;

  if (sideEffects.makesNetworkCalls && sideEffects.modifiesGlobalState) {
    breakdown.sideEffects = 3;
    explanations.push('Network calls + global state modification');
  } else if (sideEffectCount >= 5) {
    breakdown.sideEffects = 3;
    explanations.push(`Many side effects (${sideEffectCount})`);
  } else if (sideEffectCount >= 3) {
    breakdown.sideEffects = 2;
    explanations.push(`Multiple side effects (${sideEffectCount})`);
  } else if (sideEffectCount >= 1) {
    breakdown.sideEffects = 1;
    explanations.push(`Some side effects (${sideEffectCount})`);
  }

  // Penalización adicional por tipos críticos
  if (sideEffects.modifiesGlobalState) {
    breakdown.sideEffects = Math.max(breakdown.sideEffects, 2);
  }

  if (sideEffects.makesNetworkCalls) {
    breakdown.sideEffects = Math.max(breakdown.sideEffects, 2);
  }

  score += breakdown.sideEffects;

  // 4. HOTSPOT RISK (0-2 points)
  // ===========================
  const inDegree = graphMetrics.inDegree || 0; // Cantidad de archivos que lo usan
  const outDegree = graphMetrics.outDegree || 0; // Cantidad de archivos que usa

  if (inDegree >= 15) {
    breakdown.hotspotRisk = 2;
    explanations.push(`Critical hotspot (used by ${inDegree} files)`);
  } else if (inDegree >= 8) {
    breakdown.hotspotRisk = 1;
    explanations.push(`Hotspot file (used by ${inDegree} files)`);
  }

  if (outDegree >= 20) {
    breakdown.hotspotRisk = Math.max(breakdown.hotspotRisk, 2);
    explanations.push(`High dependencies (${outDegree})`);
  } else if (outDegree >= 10) {
    breakdown.hotspotRisk = Math.max(breakdown.hotspotRisk, 1);
    explanations.push(`Multiple dependencies (${outDegree})`);
  }

  score += breakdown.hotspotRisk;

  // 5. COUPLING RISK (0-1 point)
  // ==========================
  // Usar solo ciclos problemáticos (no los arquitectónicamente válidos)
  const circularDependencies = graphMetrics.problematicCycles || 0;
  const coupledFiles = graphMetrics.coupledFiles || 0;

  if (circularDependencies > 0) {
    breakdown.couplingRisk = 1;
    explanations.push(`Circular dependency detected`);
  } else if (coupledFiles >= 3) {
    breakdown.couplingRisk = 1;
    explanations.push(`Tightly coupled with other files`);
  }

  score += breakdown.couplingRisk;

  // FINAL SCORE
  const finalScore = Math.min(10, score);
  const severity = calculateScoreSeverity(finalScore);

  return {
    total: finalScore,
    breakdown,
    severity,
    explanation: explanations.join('; ') || 'Low risk baseline',
    metrics: {
      functionCount,
      importCount,
      exportCount,
      connectionCount,
      sideEffectCount,
      inDegree,
      outDegree
    }
  };
}

/**
 * Calcula severidad basada en score
 *
 * @param {number} score - Score 0-10
 * @returns {string} - 'low' | 'medium' | 'high' | 'critical'
 */
export function calculateScoreSeverity(score) {
  if (score >= 8) return 'critical';
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

/**
 * Calcula risk scores para todos los archivos
 *
 * @param {object} systemMap - System map con análisis
 * @param {object} semanticConnectionsByFile - Conexiones por archivo
 * @param {object} sideEffectsByFile - Side effects por archivo
 * @param {object} graphMetrics - Métricas del grafo
 * @returns {object} - Mapa de filePath -> riskScore
 */
export function calculateAllRiskScores(
  systemMap,
  semanticConnectionsByFile,
  sideEffectsByFile,
  graphMetrics
) {
  const results = {};

  for (const [filePath, fileAnalysis] of Object.entries(systemMap.files || {})) {
    const semanticConnections = semanticConnectionsByFile[filePath] || [];
    const sideEffects = sideEffectsByFile[filePath]?.sideEffects || {};
    const metrics = graphMetrics[filePath] || {};

    results[filePath] = calculateRiskScore(
      fileAnalysis,
      semanticConnections,
      sideEffects,
      metrics
    );
  }

  return results;
}

/**
 * Identifica archivos de alto riesgo para análisis adicional
 *
 * @param {object} riskScores - Mapa de filePath -> riskScore
 * @param {number} threshold - Score mínimo (default 6.0)
 * @returns {array} - Array de { file, score, severity }
 */
export function identifyHighRiskFiles(riskScores, threshold = 6.0) {
  return Object.entries(riskScores)
    .filter(([_, analysis]) => analysis.total >= threshold)
    .map(([file, analysis]) => ({
      file,
      score: analysis.total,
      severity: analysis.severity,
      explanation: analysis.explanation
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Genera reporte de risk assessment
 *
 * @param {object} riskScores - Mapa de filePath -> riskScore
 * @param {object} options - { threshold = 6.0 }
 * @returns {object} - Reporte estructurado
 */
export function generateRiskReport(riskScores, options = {}) {
  const { threshold = 6.0 } = options;

  const allFiles = Object.entries(riskScores).map(([file, analysis]) => ({
    file,
    ...analysis
  }));

  const highRisk = allFiles.filter(f => f.severity === 'critical' || f.severity === 'high');
  const mediumRisk = allFiles.filter(f => f.severity === 'medium');
  const lowRisk = allFiles.filter(f => f.severity === 'low');

  const avgScore =
    allFiles.reduce((sum, f) => sum + f.total, 0) / (allFiles.length || 1);

  return {
    summary: {
      totalFiles: allFiles.length,
      averageScore: avgScore.toFixed(2),
      criticalCount: highRisk.filter(f => f.severity === 'critical').length,
      highCount: highRisk.filter(f => f.severity === 'high').length,
      mediumCount: mediumRisk.length,
      lowCount: lowRisk.length
    },
    highRiskFiles: highRisk.sort((a, b) => b.total - a.total),
    mediumRiskFiles: mediumRisk.sort((a, b) => b.total - a.total),
    recommendations: generateRecommendations(highRisk, mediumRisk)
  };
}

/**
 * Genera recomendaciones basadas en análisis de riesgo
 *
 * @param {array} highRisk - Archivos de alto riesgo
 * @param {array} mediumRisk - Archivos de riesgo medio
 * @returns {array} - Array de recomendaciones
 */
function generateRecommendations(highRisk, mediumRisk) {
  const recommendations = [];

  if (highRisk.length > 5) {
    recommendations.push({
      priority: 'critical',
      message: 'Too many high-risk files. Consider refactoring architecture'
    });
  }

  if (highRisk.length > 0) {
    recommendations.push({
      priority: 'high',
      message: `Review ${highRisk.length} high-risk files for potential issues`
    });
  }

  const criticalFiles = highRisk.filter(f => f.severity === 'critical');
  if (criticalFiles.length > 0) {
    recommendations.push({
      priority: 'critical',
      message: `${criticalFiles.length} files have critical risk. Schedule immediate review`
    });
  }

  return recommendations;
}

export default {
  calculateRiskScore,
  calculateScoreSeverity,
  calculateAllRiskScores,
  identifyHighRiskFiles,
  generateRiskReport
};

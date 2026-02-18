/**
 * @fileoverview Risk Analyzer - Análisis de riesgos
 * 
 * @module pipeline/enhance/analyzers
 */

import { calculateAllRiskScores, generateRiskReport } from '../../../analyses/tier3/index.js';
import { analyzeBrokenConnections } from '../../../analyses/tier3/broken-connections-detector.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:enhance:risk');

/**
 * Calcula métricas del grafo para cada archivo
 * @param {Object} systemMap - System map
 * @returns {Object} Métricas por archivo
 */
export function calculateGraphMetrics(systemMap) {
  const graphMetrics = {};

  for (const [filePath, fileData] of Object.entries(systemMap.files || {})) {
    graphMetrics[filePath] = {
      inDegree: (fileData.usedBy || []).length,
      outDegree: (fileData.dependsOn || []).length,
      totalCycles: systemMap.metadata.cyclesDetected.filter(
        cycle => cycle.includes(filePath)
      ).length,
      problematicCycles: 0,
      coupledFiles: (fileData.usedBy || []).filter(f =>
        (systemMap.files[f]?.dependsOn || []).includes(filePath)
      ).length
    };
  }

  return graphMetrics;
}

/**
 * Calcula risk scores para todos los archivos
 * @param {Object} systemMap - System map
 * @param {Object} semanticConnectionsByFile - Conexiones por archivo
 * @param {Object} allSideEffects - Side effects por archivo
 * @param {Object} graphMetrics - Métricas del grafo
 * @returns {Object} Risk scores
 */
export function calculateRisks(systemMap, semanticConnectionsByFile, allSideEffects, graphMetrics) {
  logger.debug('Calculating risk scores...');

  return calculateAllRiskScores(
    systemMap,
    semanticConnectionsByFile,
    allSideEffects,
    graphMetrics
  );
}

/**
 * Analiza conexiones rotas
 * @param {Object} systemMap - System map
 * @param {Object} advancedConnections - Conexiones avanzadas
 * @returns {Object} Análisis de conexiones rotas
 */
export function analyzeBroken(systemMap, advancedConnections) {
  logger.debug('Analyzing broken connections...');
  return analyzeBrokenConnections(systemMap, advancedConnections);
}

/**
 * Genera reporte completo de riesgos
 * @param {Object} riskScores - Risk scores
 * @returns {Object} Reporte de riesgos
 */
export function generateReport(riskScores) {
  return generateRiskReport(riskScores);
}

/**
 * @fileoverview stats-calculator.js
 * 
 * Cálculo de estadísticas del proyecto
 * 
 * @module project-analyzer/reports/stats-calculator
 */

import { FORMAT_CONFIG } from '../constants.js';

/**
 * Calcula estadísticas de la estructura del proyecto
 * @param {Array} clusters - Clusters detectados
 * @param {Array} orphans - Huérfanos detectados
 * @param {number} totalFiles - Total de archivos
 * @returns {object}
 */
export function calculateStructureStats(clusters, orphans, totalFiles) {
  const clusteredFiles = clusters.reduce((sum, c) => sum + c.fileCount, 0);
  const orphanCount = orphans.length;

  return {
    totalFiles,
    clusteredFiles,
    orphanFiles: orphanCount,
    subsystemCount: clusters.length,
    coveragePercentage: calculateCoverage(clusteredFiles, totalFiles)
  };
}

/**
 * Calcula porcentaje de cobertura
 * @private
 */
function calculateCoverage(clusteredFiles, totalFiles) {
  if (totalFiles === 0) return '0.0';
  return ((clusteredFiles / totalFiles) * 100).toFixed(FORMAT_CONFIG.PERCENTAGE_DECIMALS);
}

/**
 * Calcula distribución de archivos por subsistema
 * @param {Array} clusters - Clusters
 * @returns {Array<{name: string, percentage: string}>}
 */
export function calculateSubsystemDistribution(clusters) {
  const totalFiles = clusters.reduce((sum, c) => sum + c.fileCount, 0);
  
  if (totalFiles === 0) return [];

  return clusters.map(cluster => ({
    name: cluster.name,
    fileCount: cluster.fileCount,
    percentage: ((cluster.fileCount / totalFiles) * 100).toFixed(1)
  }));
}

/**
 * Encuentra el subsistema más cohesivo
 * @param {Array} clusters - Clusters
 * @returns {object|null}
 */
export function findMostCohesiveSubsystem(clusters) {
  if (!clusters?.length) return null;
  
  return clusters.reduce((max, cluster) => 
    cluster.cohesion > max.cohesion ? cluster : max
  );
}

/**
 * Calcula estadísticas de huérfanos
 * @param {Array} orphans - Huérfanos
 * @returns {object}
 */
export function calculateOrphanStats(orphans) {
  const total = orphans.length;
  const withSideEffects = orphans.filter(o => o.hasSideEffects).length;
  
  return {
    total,
    withSideEffects,
    withoutSideEffects: total - withSideEffects,
    highSeverity: orphans.filter(o => o.severity === 'high').length,
    lowSeverity: orphans.filter(o => o.severity === 'low').length
  };
}

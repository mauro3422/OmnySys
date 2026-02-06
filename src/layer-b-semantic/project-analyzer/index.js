/**
 * @fileoverview index.js
 * 
 * Facade del analizador de estructura de proyecto
 * 
 * @module project-analyzer
 */

// Constantes
export {
  COHESION_WEIGHTS,
  COHESION_THRESHOLDS,
  Severity,
  DIRECTORY_CONFIG,
  REPORT_TEXTS,
  FORMAT_CONFIG
} from './constants.js';

// Utilidades
export {
  calculateCohesion,
  calculateInternalCohesion,
  detectClusters,
  findCommonDirectory,
  identifyOrphans,
  hasSignificantSideEffects,
  calculateCohesionMatrix,
  getMostCohesiveFiles,
  calculateMatrixStats
} from './utils/index.js';

// Reportes
export {
  generateStructureReport,
  calculateStructureStats,
  calculateSubsystemDistribution,
  findMostCohesiveSubsystem,
  calculateOrphanStats
} from './reports/index.js';

// Funciones principales
import { calculateCohesionMatrix } from './utils/matrix-builder.js';
import { detectClusters } from './utils/cluster-detector.js';
import { identifyOrphans } from './utils/orphan-detector.js';
import { calculateStructureStats } from './reports/stats-calculator.js';
import { generateStructureReport } from './reports/structure-report.js';

/**
 * Analiza la estructura completa del proyecto
 * @param {object} staticResults - Resultados del análisis estático
 * @returns {object} - Estructura del proyecto con subsistemas detectados
 */
export function analyzeProjectStructure(staticResults) {
  // 1. Calcular cohesión
  const cohesionMatrix = calculateCohesionMatrix(staticResults);

  // 2. Detectar clusters (subsistemas)
  const clusters = detectClusters(cohesionMatrix);

  // 3. Identificar huérfanos
  const orphans = identifyOrphans(staticResults, cohesionMatrix);

  // 4. Estadísticas
  const stats = calculateStructureStats(
    clusters,
    orphans,
    Object.keys(staticResults.files || {}).length
  );

  return {
    subsystems: clusters,
    orphans,
    stats
  };
}

// Default export
export default {
  analyzeProjectStructure,
  generateStructureReport
};

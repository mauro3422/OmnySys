/**
 * @fileoverview index.js
 * 
 * Re-export de utilidades
 * 
 * @module project-analyzer/utils
 */

export {
  calculateCohesion,
  calculateInternalCohesion
} from './cohesion-calculator.js';

export {
  detectClusters,
  findCommonDirectory
} from './cluster-detector.js';

export {
  identifyOrphans,
  hasSignificantSideEffects
} from './orphan-detector.js';

export {
  calculateCohesionMatrix,
  getMostCohesiveFiles,
  calculateMatrixStats
} from './matrix-builder.js';

/**
 * @fileoverview index.js
 * 
 * Barrel exports para utilidades del repositorio
 * 
 * @module storage/repository/utils
 */

export {
  calculateAtomVectors,
  calculateLinesOfCode,
  calculateArchetypeWeight,
  calculateCohesion,
  calculateCoupling,
  calculateImportance,
  calculateStability,
  calculatePropagation,
  calculateCompatibility,
  calculateRenameImpact,
  calculateMoveImpact
} from './vector-calculator.js';
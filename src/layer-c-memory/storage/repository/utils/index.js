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

export {
  VALID_DNA_PREDICATE,
  DUPLICATE_ELIGIBLE_PREDICATE,
  DUPLICATE_DNA_FIELDS,
  STRUCTURAL_DUPLICATE_DNA_FIELDS,
  DUPLICATE_MODES,
  DEFAULT_DUPLICATE_ATOM_TYPES,
  normalizeDnaValue,
  parseDnaValue,
  getValidDnaPredicate,
  getDuplicateEligiblePredicate,
  getDuplicateScopeClauses,
  buildDuplicateWhereSql,
  isDuplicateEligibleAtom,
  normalizeDuplicateCandidateAtom,
  buildDuplicateKeyFromDna,
  buildStructuralDuplicateKeyFromDna,
  buildDuplicateKeyForMode,
  getDuplicateKeySql,
  getStructuralDuplicateKeySql,
  getDuplicateKeySqlForMode,
  getDuplicateModeLabel
} from './duplicate-dna.js';

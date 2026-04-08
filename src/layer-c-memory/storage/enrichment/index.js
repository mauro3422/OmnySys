/**
 * @fileoverview Barrel for enrichment module.
 * Re-exports all public APIs from the folderized family.
 * @module storage/enrichment
 */

import {
  enrichAtomsWithRelations,
  enrichAtomsForFile,
  enrichAtomWithFullRelations
} from './enrich-atoms.js';

import { getRelationStats } from './relation-stats.js';
import { persistGraphMetrics } from './persist-graph-metrics.js';

import {
  calculateStructuralCentrality,
  getStoredGraphCounts,
  buildSyntheticRelations,
  isTransientSqliteAvailabilityError,
  calculatePropagationScore,
  predictBreakingRisk
} from './graph-algebra.js';

export {
  calculateStructuralCentrality,
  getStoredGraphCounts,
  buildSyntheticRelations,
  isTransientSqliteAvailabilityError,
  calculatePropagationScore,
  predictBreakingRisk
} from './graph-algebra.js';

export {
  enrichAtomsWithRelations,
  enrichAtomsForFile,
  enrichAtomWithFullRelations
} from './enrich-atoms.js';

export { getRelationStats } from './relation-stats.js';
export { persistGraphMetrics } from './persist-graph-metrics.js';

export default {
  enrichAtomsWithRelations,
  enrichAtomsForFile,
  enrichAtomWithFullRelations,
  getRelationStats,
  persistGraphMetrics,
  calculateStructuralCentrality,
  getStoredGraphCounts,
  buildSyntheticRelations,
  isTransientSqliteAvailabilityError,
  calculatePropagationScore,
  predictBreakingRisk
};

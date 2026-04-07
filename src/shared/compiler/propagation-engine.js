/**
 * @fileoverview Thin barrel — delegates to propagation-engine/index.js
 * Maintains backward compatibility for existing imports.
 */
export {
  buildConnectedSystems,
  buildPropagationMode,
  normalizeList,
  takeTop,
  normalizePropagationCore,
  normalizeChangeSpecificKeyFields,
  normalizePropagationCollections,
  buildPropagationCacheKey,
  getPropagationPlanCacheEntry,
  setPropagationPlanCacheEntry,
  clearPropagationPlanCache,
  buildPropagationPlan,
  summarizePropagationPlan,
  buildImpactWavePropagationPlan,
  buildTopologyRegressionPropagationPlan,
  buildSemanticCoveragePropagationPlan,
  buildPolicyDriftPropagationPlan,
  buildPipelineHealthPropagationPlan,
  buildPipelineOrphanPropagationPlan,
  buildDuplicateRiskPropagationPlan,
  buildIntegrityGuardPropagationPlan
} from './propagation-engine/index.js';

export { default } from './propagation-engine/index.js';

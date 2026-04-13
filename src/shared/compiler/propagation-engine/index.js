export { buildConnectedSystems } from './connected-systems.js';
export { buildPropagationMode } from './mode-resolver.js';
export {
  normalizeList,
  takeTop,
  normalizePropagationCore,
  normalizeChangeSpecificKeyFields,
  normalizePropagationCollections
} from './normalization.js';
export {
  buildPropagationCacheKey,
  getPropagationPlanCacheEntry,
  setPropagationPlanCacheEntry,
  clearPropagationPlanCache
} from './cache.js';
export { buildPropagationPlan, summarizePropagationPlan } from './plan-builder.js';
export { buildImpactWavePropagationPlan } from './change-type-plans/impact-wave.js';
export { buildTopologyRegressionPropagationPlan } from './change-type-plans/topology-regression.js';
export { buildSemanticCoveragePropagationPlan } from './change-type-plans/semantic-coverage.js';
export { buildPolicyDriftPropagationPlan } from './change-type-plans/policy-drift.js';
export { buildPipelineHealthPropagationPlan } from './change-type-plans/pipeline-health.js';
export { buildPipelineOrphanPropagationPlan } from './change-type-plans/pipeline-orphan.js';
export { buildDuplicateRiskPropagationPlan } from './change-type-plans/duplicate-risk.js';
export { buildIntegrityGuardPropagationPlan } from './change-type-plans/integrity-guard.js';
export { buildMetricCoherencePropagationPlan } from './change-type-plans/metric-coherence.js';
export { buildNamingDebtPropagationPlan } from './change-type-plans/naming-debt.js';

// Default export — import named exports first so they're in scope
import { buildPropagationCacheKey } from './cache.js';
import { buildPropagationPlan, summarizePropagationPlan } from './plan-builder.js';
import { buildImpactWavePropagationPlan } from './change-type-plans/impact-wave.js';
import { buildTopologyRegressionPropagationPlan } from './change-type-plans/topology-regression.js';
import { buildSemanticCoveragePropagationPlan } from './change-type-plans/semantic-coverage.js';
import { buildPolicyDriftPropagationPlan } from './change-type-plans/policy-drift.js';
import { buildPipelineHealthPropagationPlan } from './change-type-plans/pipeline-health.js';
import { buildPipelineOrphanPropagationPlan } from './change-type-plans/pipeline-orphan.js';
import { buildDuplicateRiskPropagationPlan } from './change-type-plans/duplicate-risk.js';
import { buildIntegrityGuardPropagationPlan } from './change-type-plans/integrity-guard.js';
import { buildMetricCoherencePropagationPlan } from './change-type-plans/metric-coherence.js';
import { buildNamingDebtPropagationPlan } from './change-type-plans/naming-debt.js';
import { clearPropagationPlanCache, getPropagationPlanCacheEntry, setPropagationPlanCacheEntry } from './cache.js';

export default {
  buildPropagationCacheKey,
  buildImpactWavePropagationPlan,
  buildTopologyRegressionPropagationPlan,
  buildSemanticCoveragePropagationPlan,
  buildPolicyDriftPropagationPlan,
  buildPipelineHealthPropagationPlan,
  buildPipelineOrphanPropagationPlan,
  buildDuplicateRiskPropagationPlan,
  buildIntegrityGuardPropagationPlan,
  buildMetricCoherencePropagationPlan,
  buildPropagationPlan,
  clearPropagationPlanCache,
  getPropagationPlanCacheEntry,
  setPropagationPlanCacheEntry,
  summarizePropagationPlan
};

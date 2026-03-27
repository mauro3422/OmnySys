export {
  normalizeCount,
  normalizePersistedFileCoverageSurface,
  normalizeFileImportEvidenceSurface
} from './data-gateway-contract-helpers-normalization.js';

export {
  resolveSurfaceReason,
  hasNonEmptyList,
  hasAnyCoreCoverage,
  hasCoreCoverageGaps,
  scoreSurfaceState
} from './data-gateway-contract-helpers-scoring.js';

export {
  buildSurfaceEntry,
  summarizeSurfaceEntries
} from './data-gateway-contract-helpers-ledger.js';

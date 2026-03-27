/**
 * @fileoverview Canonical semantic surface granularity helpers.
 *
 * `semantic_connections` is a file-level semantic summary surface.
 * The canonical detail surface lives in atom semantic metadata columns such as
 * `shared_state_json`, `event_emitters_json`, and `event_listeners_json`.
 * They are related but not equivalent.
 *
 * This helper makes that contract explicit so runtime code stops comparing the
 * totals directly or treating the file-level surface as a 1:1 mirror.
 *
 * @module shared/compiler/semantic-surface-granularity
 */

export {
  classifyLegacyBucket,
  normalizeSemanticConnectionRow,
  usesLegacySemanticBucket,
  requiresCanonicalSemanticNormalization
} from './semantic-surface-granularity-legacy.js';

export {
  buildLegacyView,
  summarizeConnectionTypes
} from './semantic-surface-granularity-view.js';

export {
  summarizeSemanticCanonicality,
  getSemanticSurfaceGranularity
} from './semantic-surface-granularity-contract.js';

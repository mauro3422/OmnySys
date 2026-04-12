/**
 * @fileoverview Helper builders for the compiler contract layer.
 *
 * Keeps the surface inventory and invariant construction separate from the
 * orchestration layer so the contract file stays thin and easier to extend.
 *
 * @module shared/compiler/compiler-contract-layer-helpers
 */

export { normalizeCount } from '../surface-utils.js';
export { buildSurface, buildInvariant, buildSurfaceInventory } from '../contract-layer-helpers-surface/index.js';
export { buildCanonicalEntrypoints } from '../compiler-contract-layer-helpers-entrypoints.js';

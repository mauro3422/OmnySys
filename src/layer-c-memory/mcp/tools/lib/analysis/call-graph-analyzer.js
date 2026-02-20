/**
 * @fileoverview call-graph-analyzer.js
 *
 * Re-exports findCallSites from the canonical layer-graph implementation.
 * Single source of truth lives in layer-graph/query/call-graph-analyzer.js
 *
 * @module analysis/call-graph-analyzer
 */

export { findCallSites } from '#layer-graph/query/call-graph-analyzer.js';

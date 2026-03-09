/**
 * @fileoverview Legacy compatibility wrapper for tunnel vision pattern analysis
 *
 * Canonical pattern analysis now lives in `../analysis/pattern-analyzer.js`.
 * Keep this file as a thin shim for older imports.
 *
 * @module core/tunnel-vision-logger/stats/analyzer
 */

export { analyzePatterns } from '../analysis/pattern-analyzer.js';

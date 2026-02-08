/**
 * @fileoverview index.js
 * 
 * Analysis library - Re-exports all analysis functions
 * Facade pattern for backward compatibility
 * 
 * @module analysis
 */

export { findCallSites } from './call-graph-analyzer.js';
export { analyzeFunctionSignature } from './signature-analyzer.js';
export { analyzeValueFlow } from './value-flow-analyzer.js';

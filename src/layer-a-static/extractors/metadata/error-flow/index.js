/**
 * @fileoverview Error Flow Module
 * 
 * Sistema modular de análisis de flujo de errores.
 * 
 * @module error-flow
 * @version 2.0.0
 */

// Main function
export { extractErrorFlow } from './extractors/error-flow-extractor.js';

// Extractors
export { extractThrows } from './extractors/throw-extractor.js';
export { extractCatches, extractTryBlocks } from './extractors/catch-extractor.js';

// Analyzers
export { detectPropagationPattern, detectUnhandledCalls } from './analyzers/propagation-analyzer.js';

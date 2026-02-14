/**
 * @fileoverview Error Flow (Legacy Compatibility)
 * 
 * @deprecated Use './error-flow/index.js' instead
 * @module error-flow-legacy
 * @version 2.0.0
 */

export {
  extractErrorFlow,
  extractThrows,
  extractCatches,
  extractTryBlocks,
  detectPropagationPattern,
  detectUnhandledCalls
} from './error-flow/index.js';

export { extractErrorFlow as default } from './error-flow/extractors/error-flow-extractor.js';

/**
 * @fileoverview DNA Extractor - Barrel Export
 * 
 * Extracts structural DNA from atoms for identification
 * across evolution (name changes, refactoring, etc.)
 * 
 * SSOT: This module is the ONLY place where atom DNA is defined.
 * 
 * @module layer-a-static/extractors/metadata/dna-extractor
 */

// Main function
export { extractDNA } from './main-extractor.js';

// Hash computation
export {
  computeStructuralHash,
  computeContextualHash,
  computeSemanticHash,
  computePatternHash,
  computeDNAId
} from './hash-computer.js';

// Flow analysis
export {
  detectFlowType,
  extractOperationSequence,
  computeComplexity
} from './flow-analyzer.js';

// Semantic analysis
export {
  computeSemanticFingerprint,
  deriveVerb,
  deriveDomain,
  deriveEntity
} from './semantic-analyzer.js';

// Scoring
export { computeDuplicabilityScore } from './duplicability-scorer.js';

// Helpers
export { compareDNA, validateDNA } from './dna-helpers.js';

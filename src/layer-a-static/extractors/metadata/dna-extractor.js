/**
 * @fileoverview DNA Extractor (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular dna-extractor directory.
 * Please update your imports to use the new structure.
 * 
 * SSOT: The modular version in ./dna-extractor/ is the ONLY place 
 * where atom DNA is defined.
 * 
 * @deprecated Use ./dna-extractor/index.js or specific modules
 * @module layer-a-static/extractors/metadata/dna-extractor-deprecated
 */

export {
  // Main function
  extractDNA,
  // Hash computation
  computeStructuralHash,
  computeContextualHash,
  computeSemanticHash,
  computePatternHash,
  computeDNAId,
  // Flow analysis
  detectFlowType,
  extractOperationSequence,
  computeComplexity,
  // Semantic analysis
  computeSemanticFingerprint,
  deriveVerb,
  deriveDomain,
  deriveEntity,
  // Scoring
  computeDuplicabilityScore,
  // Helpers
  compareDNA,
  validateDNA
} from './dna-extractor/index.js';

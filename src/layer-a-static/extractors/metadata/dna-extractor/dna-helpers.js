/**
 * @fileoverview DNA Helpers
 * Helper functions for DNA comparison and validation
 * 
 * @module layer-a-static/extractors/metadata/dna-extractor/dna-helpers
 */

/**
 * Compares two DNAs and returns similarity (0-1)
 * 
 * @param {Object} dna1 - First DNA
 * @param {Object} dna2 - Second DNA
 * @returns {number} Similarity between 0 and 1
 */
export function compareDNA(dna1, dna2) {
  if (!dna1 || !dna2) return 0;

  let score = 0;
  let weights = 0;

  // Structural (40%)
  if (dna1.structuralHash === dna2.structuralHash) {
    score += 0.4;
  }
  weights += 0.4;

  // Pattern (30%)
  if (dna1.patternHash === dna2.patternHash) {
    score += 0.3;
  } else if (dna1.flowType === dna2.flowType) {
    score += 0.15; // Half if same flow type but different hash
  }
  weights += 0.3;

  // Operations (20%)
  const ops1 = dna1.operationSequence.join(',');
  const ops2 = dna2.operationSequence.join(',');
  if (ops1 === ops2) {
    score += 0.2;
  } else if (dna1.operationSequence.length === dna2.operationSequence.length) {
    score += 0.1;
  }
  weights += 0.2;

  // Semantic (10%)
  if (dna1.semanticFingerprint === dna2.semanticFingerprint) {
    score += 0.1;
  }
  weights += 0.1;

  return weights > 0 ? score / weights : 0;
}

/**
 * Validates that DNA makes sense
 * 
 * @param {Object} dna - DNA object
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateDNA(dna) {
  const errors = [];

  if (!dna.id) errors.push('Missing DNA ID');
  if (!dna.structuralHash) errors.push('Missing structural hash');
  if (!dna.patternHash) errors.push('Missing pattern hash');
  if (!dna.flowType || dna.flowType === 'unknown') errors.push('Unknown flow type');
  if (dna.complexityScore < 1 || dna.complexityScore > 10) {
    errors.push('Invalid complexity score');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

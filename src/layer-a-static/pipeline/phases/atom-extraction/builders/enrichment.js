/**
 * @fileoverview enrichment.js
 *
 * DNA extraction and lineage enrichment for atoms
 *
 * @module pipeline/phases/atom-extraction/builders/enrichment
 */

import { extractDNA } from '#layer-a/extractors/metadata/dna-extractor.js';
import { validateForLineage } from '#layer-b/validators/lineage-validator.js';
import { logger } from '#utils/logger.js';

/**
 * Enrich atom with DNA and lineage validation
 * @param {Object} atomMetadata - Atom metadata to enrich
 * @param {string} functionName - Function name for logging
 */
export function enrichWithDNA(atomMetadata, functionName) {
  try {
    atomMetadata.dna = extractDNA(atomMetadata);
  } catch (error) {
    logger.warn(`DNA extraction failed for ${functionName}: ${error.message}`);
  }

  if (atomMetadata.dna) {
    const validation = validateForLineage(atomMetadata);
    atomMetadata._meta.lineageValidation = {
      valid: validation.valid,
      confidence: validation.confidence,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }
}

export default { enrichWithDNA };

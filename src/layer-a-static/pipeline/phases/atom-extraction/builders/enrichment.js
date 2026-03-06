/**
 * @fileoverview enrichment.js
 *
 * DNA extraction and lineage enrichment for atoms
 *
 * @module pipeline/phases/atom-extraction/builders/enrichment
 */

import { extractDNA } from '#layer-a/extractors/metadata/dna-extractor.js';
import { validateForLineage } from '#layer-b/validators/lineage-validator/index.js';
import { logger } from '#utils/logger.js';
import { detectRegistrations } from '../../registration-detector.js';

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

/**
 * Enrich file metadata with dynamic registrations detection
 * @param {Object} fileMetadata - File metadata object
 * @param {string} filePath - Path to the file
 * @param {string} code - Full source code of the file
 */
export function enrichWithRegistrations(fileMetadata, filePath, code) {
  try {
    const registrations = detectRegistrations(filePath, code);
    
    if (registrations.length > 0) {
      fileMetadata.registrations = registrations;
      fileMetadata.hasDynamicImpact = true;
      
      logger.debug(`Enriched ${filePath} with ${registrations.length} registrations`);
    }
  } catch (error) {
    logger.warn(`Registration detection failed for ${filePath}: ${error.message}`);
  }
}

export default { enrichWithDNA, enrichWithRegistrations };

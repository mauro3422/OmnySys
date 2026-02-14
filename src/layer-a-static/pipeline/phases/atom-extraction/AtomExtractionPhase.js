/**
 * @fileoverview AtomExtractionPhase.js
 *
 * Phase 1: Extract atoms (functions) from source code
 * Creates atomic metadata for each function in the file
 *
 * @module pipeline/phases/atom-extraction/AtomExtractionPhase
 */

import { ExtractionPhase } from '../base-phase.js';
import { logger } from '../../../utils/logger.js';
import { extractAtoms } from './extraction/atom-extractor.js';
import { buildCallGraph } from './graph/call-graph.js';
import { recalculateArchetypes } from './metadata/archetype.js';

/**
 * Phase 1: Extract atomic metadata from functions
 */
export class AtomExtractionPhase extends ExtractionPhase {
  constructor() {
    super('atom-extraction');
  }

  /**
   * Execute atom extraction
   * @param {Object} context - Extraction context
   * @param {string} context.filePath - File path
   * @param {string} context.code - Source code
   * @param {Object} context.fileInfo - Parsed file info with functions
   * @param {Object} context.fileMetadata - File-level metadata
   * @returns {Promise<Object>} - Context with extracted atoms
   */
  async execute(context) {
    const { filePath, code, fileInfo, fileMetadata } = context;

    logger.debug(`Phase 1: Extracting atoms from ${filePath}`);

    // Extract atoms (functions)
    const atoms = await extractAtoms(fileInfo, code, fileMetadata, filePath);

    // Build call graph relationships
    buildCallGraph(atoms);

    // Recalculate archetypes with calledBy info
    recalculateArchetypes(atoms);

    context.atoms = atoms;
    context.atomCount = atoms.length;

    logger.debug(`Phase 1: Extracted ${atoms.length} atoms`);

    return context;
  }
}

export default AtomExtractionPhase;

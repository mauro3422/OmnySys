/**
 * @fileoverview chain-building-phase.js
 *
 * Phase 2: Build molecular chains from atoms
 * Identifies data flow chains and enriches atoms with chain info
 *
 * @module pipeline/phases/chain-building-phase
 */

import { ExtractionPhase } from './base-phase.js';
import { logger } from '../../utils/logger.js';

/**
 * Phase 2: Build molecular chains
 */
export class ChainBuildingPhase extends ExtractionPhase {
  constructor() {
    super('chain-building');
  }

  /**
   * Check if can execute
   */
  canExecute(context) {
    return context.atoms && context.atoms.length > 0;
  }

  /**
   * Execute chain building
   * @param {Object} context - Extraction context with atoms
   * @returns {Promise<Object>} - Context with chains
   */
  async execute(context) {
    const { atoms } = context;

    logger.debug('Phase 2: Building molecular chains');

    try {
      // Dynamically import chain builders
      const { buildMolecularChains, enrichAtomsWithChains } = await import('../molecular-chains/index.js');
      
      // Build chains
      const chainData = buildMolecularChains(atoms);
      
      // Enrich atoms
      const enrichedAtoms = enrichAtomsWithChains(atoms, chainData);

      // Update context
      context.atoms = enrichedAtoms;
      context.molecularChains = {
        chains: chainData.chains,
        graph: chainData.graph,
        summary: chainData.summary
      };

      logger.debug(`Phase 2: Built ${chainData.chains.length} chains`);

    } catch (error) {
      logger.warn('Chain building failed:', error.message);
      // Don't fail extraction if chains fail
      context.molecularChains = null;
    }

    return context;
  }
}

export default ChainBuildingPhase;

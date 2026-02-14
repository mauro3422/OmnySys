/**
 * @fileoverview ChainSummaryBuilder.js
 * 
 * Builds and updates chain summaries.
 * 
 * @module molecular-chains/builders/ChainSummaryBuilder
 */

/**
 * Builds chain summaries
 */
export class ChainSummaryBuilder {
  /**
   * Build summary from chains
   * @param {Array} chains - Chain objects
   * @returns {Object} - Summary statistics
   */
  build(chains) {
    if (chains.length === 0) {
      return {
        totalChains: 0,
        totalFunctions: 0,
        avgChainLength: 0,
        maxComplexity: 0,
        chainsWithSideEffects: 0
      };
    }

    return {
      totalChains: chains.length,
      totalFunctions: new Set(chains.flatMap(c => 
        c.steps.map(s => s.function)
      )).size,
      avgChainLength: chains.reduce((sum, c) => sum + c.steps.length, 0) / chains.length,
      maxComplexity: Math.max(...chains.map(c => c.complexity), 0),
      chainsWithSideEffects: chains.filter(c => c.hasSideEffects).length
    };
  }

  /**
   * Recalculate metrics for a chain
   * @param {Object} chain - Chain to update
   */
  recalculateMetrics(chain) {
    chain.totalFunctions = new Set(chain.steps.map(s => s.function)).size;
    chain.totalTransforms = chain.steps.reduce((sum, s) => 
      sum + s.internalTransforms.length, 0
    );
    chain.hasSideEffects = chain.steps.some(s => 
      s.output.type === 'mixed' || s.output.type === 'side_effect'
    );
    chain.complexity = chain.steps.reduce((sum, s) => 
      sum + (s.internalTransforms.length * 2), 0
    );
  }
}

export default ChainSummaryBuilder;

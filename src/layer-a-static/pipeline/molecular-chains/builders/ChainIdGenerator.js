/**
 * @fileoverview ChainIdGenerator.js
 * 
 * Generates unique IDs for chains.
 * 
 * @module molecular-chains/builders/ChainIdGenerator
 */

/**
 * Generates unique chain IDs
 */
export class ChainIdGenerator {
  constructor() {
    this.counter = 0;
  }

  /**
   * Generate unique chain ID
   * @returns {string} - Unique ID
   */
  generate() {
    return `chain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${this.counter++}`;
  }
}

export default ChainIdGenerator;

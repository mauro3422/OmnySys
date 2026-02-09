/**
 * @fileoverview base-phase.js
 *
 * Base class for molecular extraction phases
 * Implements Template Method pattern for extraction pipeline
 *
 * @module pipeline/phases/base-phase
 */

/**
 * Abstract base class for extraction phases
 * @abstract
 */
export class ExtractionPhase {
  /**
   * @param {string} name - Phase name for logging/debugging
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Execute the phase
   * @abstract
   * @param {Object} context - Extraction context with molecules, atoms, etc.
   * @returns {Promise<Object>} - Modified context
   */
  async execute(context) {
    throw new Error(`Phase ${this.name} must implement execute()`);
  }

  /**
   * Check if this phase can execute with current context
   * Override for conditional phases
   * @param {Object} context - Extraction context
   * @returns {boolean} - True if can execute
   */
  canExecute(context) {
    return true;
  }

  /**
   * Validate context before execution
   * @param {Object} context - Context to validate
   * @returns {boolean} - True if valid
   */
  validateContext(context) {
    return context !== null && typeof context === 'object';
  }

  /**
   * Handle errors during phase execution
   * @param {Error} error - The error that occurred
   * @param {Object} context - Current context
   * @returns {Object} - Error result or modified context
   */
  handleError(error, context) {
    throw error; // Default: re-throw
  }
}

export default ExtractionPhase;

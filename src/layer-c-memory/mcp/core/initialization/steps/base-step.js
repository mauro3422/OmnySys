/**
 * @fileoverview base-step.js
 *
 * Base class for initialization steps
 * Implements Command pattern for server initialization
 *
 * @module mcp/core/initialization/steps/base-step
 */

/**
 * Abstract base class for initialization steps
 * @abstract
 */
export class InitializationStep {
  /**
   * @param {string} name - Step name
   * @param {Object} options - Step options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
  }

  /**
   * Execute the initialization step
   * @abstract
   * @param {Object} server - Server instance
   * @returns {Promise<boolean>} - True to continue, false to halt
   */
  async execute(server) {
    throw new Error(`Step ${this.name} must implement execute()`);
  }

  /**
   * Rollback this step in case of failure
   * @param {Object} server - Server instance
   * @param {Error} error - The error that caused rollback
   * @returns {Promise<void>}
   */
  async rollback(server, error) {
    // Default: no rollback needed
    console.error(`  ⚠️  No rollback implemented for step: ${this.name}`);
  }

  /**
   * Check if this step should be executed
   * @param {Object} server - Server instance
   * @returns {boolean} - True if should execute
   */
  shouldExecute(server) {
    return true;
  }
}

export default InitializationStep;

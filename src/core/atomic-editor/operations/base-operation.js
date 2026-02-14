/**
 * @fileoverview Base Operation
 * 
 * Abstract base class for all atomic operations.
 * Implements the Command pattern with validation,
 * execution, and undo support preparation.
 * 
 * @module atomic-editor/operations/base-operation
 */

/**
 * @typedef {Object} OperationContext
 * @property {string} projectPath - Project base path
 * @property {Object} [orchestrator] - System orchestrator
 * @property {Function} [emit] - Event emitter function
 * @property {Object} [validators] - Validator instances
 */

/**
 * @typedef {Object} OperationResult
 * @property {boolean} success - Whether operation succeeded
 * @property {string} operation - Operation type
 * @property {string} file - Target file path
 * @property {Object} [data] - Additional result data
 * @property {Error} [error] - Error if failed
 */

export class BaseOperation {
  /**
   * @param {string} filePath - Target file path (relative to project)
   * @param {OperationContext} context - Operation context
   */
  constructor(filePath, context) {
    this.filePath = filePath;
    this.context = context;
    this.executed = false;
    this.result = null;
    this.timestamp = null;
  }

  /**
   * Operation type identifier
   * @type {string}
   */
  get type() {
    return 'base';
  }

  /**
   * Validates the operation before execution
   * @abstract
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async validate() {
    throw new Error('validate() must be implemented by subclass');
  }

  /**
   * Executes the operation
   * @abstract
   * @returns {Promise<OperationResult>}
   */
  async execute() {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Prepares undo information (future implementation)
   * @abstract
   * @returns {Promise<Object|null>}
   */
  async prepareUndo() {
    // Override in subclass to support undo
    return null;
  }

  /**
   * Undoes the operation (future implementation)
   * @abstract
   * @param {Object} undoData - Data from prepareUndo
   * @returns {Promise<OperationResult>}
   */
  async undo(undoData) {
    throw new Error('undo() not implemented');
  }

  /**
   * Gets the absolute file path
   * @protected
   * @returns {Promise<string>}
   */
  async _getAbsolutePath() {
    const { default: path } = await import('path');
    return path.join(this.context.projectPath, this.filePath);
  }

  /**
   * Emits an event if emitter is available
   * @protected
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  _emit(event, data) {
    if (this.context.emit) {
      this.context.emit(event, {
        ...data,
        timestamp: Date.now(),
        operation: this.type
      });
    }
  }

  /**
   * Marks operation as executed
   * @protected
   * @param {OperationResult} result - Execution result
   */
  _markExecuted(result) {
    this.executed = true;
    this.result = result;
    this.timestamp = Date.now();
  }

  /**
   * Creates a standardized result object
   * @protected
   * @param {boolean} success - Success status
   * @param {Object} [data] - Additional data
   * @param {Error} [error] - Error if failed
   * @returns {OperationResult}
   */
  _createResult(success, data = {}, error = null) {
    return {
      success,
      operation: this.type,
      file: this.filePath,
      ...data,
      ...(error && { error: error.message || error })
    };
  }
}

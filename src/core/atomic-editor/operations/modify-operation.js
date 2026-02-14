/**
 * @fileoverview Modify Operation
 * 
 * Replaces content in a file. This is the core atomic edit operation
 * that replaces oldString with newString while maintaining atomicity.
 * 
 * @module atomic-editor/operations/modify-operation
 */

import { BaseOperation } from './base-operation.js';
import fs from 'fs/promises';

/**
 * @typedef {Object} ModifyOptions
 * @property {string} oldString - Content to replace
 * @property {string} newString - New content
 * @property {boolean} [all=false] - Replace all occurrences
 */

export class ModifyOperation extends BaseOperation {
  /**
   * @param {string} filePath - Target file path
   * @param {ModifyOptions} options - Modify options
   * @param {import('./base-operation.js').OperationContext} context - Operation context
   */
  constructor(filePath, options, context) {
    super(filePath, context);
    this.options = options;
    this.originalContent = null;
    this.modifiedContent = null;
    this.matchPosition = null;
  }

  get type() {
    return 'modify';
  }

  /**
   * Validates the modify operation
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async validate() {
    const { oldString, newString } = this.options;

    if (oldString === undefined) {
      return { valid: false, error: 'oldString is required for modify' };
    }

    if (newString === undefined) {
      return { valid: false, error: 'newString is required for modify' };
    }

    try {
      const absolutePath = await this._getAbsolutePath();
      const fileContent = await fs.readFile(absolutePath, 'utf-8');

      // Validate oldString exists
      if (!fileContent.includes(oldString)) {
        return { 
          valid: false, 
          error: `oldString not found: ${oldString.substring(0, 50)}...` 
        };
      }

      // Validate multiple matches when not using 'all'
      const matches = fileContent.split(oldString).length - 1;
      if (matches > 1 && !this.options.all) {
        return {
          valid: false,
          error: `Multiple matches (${matches}) found. Use all:true to replace all`
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Cannot read file: ${error.message}` };
    }
  }

  /**
   * Prepares undo data
   * @returns {Promise<Object>}
   */
  async prepareUndo() {
    return {
      content: this.originalContent,
      oldString: this.options.newString,
      newString: this.options.oldString,
      position: this.matchPosition
    };
  }

  /**
   * Executes the modify operation
   * @returns {Promise<import('./base-operation.js').OperationResult>}
   */
  async execute() {
    try {
      const absolutePath = await this._getAbsolutePath();
      
      // Read current content
      this.originalContent = await fs.readFile(absolutePath, 'utf-8');
      
      // Calculate modification
      const { newContent, position, replacements } = this._calculateModification(this.originalContent);
      this.modifiedContent = newContent;
      this.matchPosition = position;
      
      // Write new content
      await fs.writeFile(absolutePath, newContent, 'utf-8');
      
      this._markExecuted(this._createResult(true, {
        position,
        replacements,
        addedLength: this.options.newString.length,
        removedLength: this.options.oldString.length,
        netChange: this.options.newString.length - this.options.oldString.length
      }));

      this._emit('operation:modify:executed', {
        file: this.filePath,
        position,
        replacements,
        netChange: this.options.newString.length - this.options.oldString.length
      });

      return this.result;

    } catch (error) {
      return this._createResult(false, {}, error);
    }
  }

  /**
   * Undoes the modify operation
   * @param {Object} undoData - Undo data from prepareUndo
   * @returns {Promise<import('./base-operation.js').OperationResult>}
   */
  async undo(undoData) {
    try {
      const absolutePath = await this._getAbsolutePath();
      
      // Restore original content
      await fs.writeFile(absolutePath, undoData.content, 'utf-8');
      
      return this._createResult(true, { undone: true });
    } catch (error) {
      return this._createResult(false, { undone: false }, error);
    }
  }

  /**
   * Calculates modification and new content
   * @private
   * @param {string} content - Original file content
   * @returns {{newContent: string, position: {line: number, column: number}, replacements: number}}
   */
  _calculateModification(content) {
    const { oldString, newString, all } = this.options;
    
    let newContent = content;
    let position = { line: 0, column: 0 };
    let replacements = 0;

    if (all) {
      // Replace all occurrences
      const regex = new RegExp(this._escapeRegex(oldString), 'g');
      const matches = content.match(regex);
      replacements = matches ? matches.length : 0;
      
      // Get position of first match
      const firstIndex = content.indexOf(oldString);
      if (firstIndex !== -1) {
        position = this._getPositionFromIndex(content, firstIndex);
      }
      
      newContent = content.replace(regex, newString);
    } else {
      // Replace first occurrence only
      const index = content.indexOf(oldString);
      if (index !== -1) {
        replacements = 1;
        newContent = content.slice(0, index) + newString + content.slice(index + oldString.length);
        position = this._getPositionFromIndex(content, index);
      }
    }

    return { newContent, position, replacements };
  }

  /**
   * Gets line/column position from string index
   * @private
   * @param {string} content - File content
   * @param {number} index - Character index
   * @returns {{line: number, column: number}}
   */
  _getPositionFromIndex(content, index) {
    const lines = content.slice(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1]?.length || 0
    };
  }

  /**
   * Escapes special regex characters
   * @private
   * @param {string} str - String to escape
   * @returns {string}
   */
  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async _getAbsolutePath() {
    const { path } = await import('path');
    return path.join(this.context.projectPath, this.filePath);
  }
}

/**
 * Factory function for modify operation
 * @param {string} filePath - Target file path
 * @param {ModifyOptions} options - Modify options
 * @param {import('./base-operation.js').OperationContext} context - Operation context
 * @returns {ModifyOperation}
 */
export function createModifyOperation(filePath, options, context) {
  return new ModifyOperation(filePath, options, context);
}

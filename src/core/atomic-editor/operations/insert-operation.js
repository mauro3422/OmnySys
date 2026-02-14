/**
 * @fileoverview Insert Operation
 * 
 * Inserts content at a specific position or pattern.
 * Supports insertion at line numbers, after/before patterns,
 * or at end of file.
 * 
 * @module atomic-editor/operations/insert-operation
 */

import { BaseOperation } from './base-operation.js';
import fs from 'fs/promises';

/**
 * @typedef {Object} InsertOptions
 * @property {string} content - Content to insert
 * @property {number} [atLine] - Line number to insert at
 * @property {string} [after] - Pattern to insert after
 * @property {string} [before] - Pattern to insert before
 * @property {boolean} [atEnd] - Insert at end of file
 */

export class InsertOperation extends BaseOperation {
  /**
   * @param {string} filePath - Target file path
   * @param {InsertOptions} options - Insert options
   * @param {import('./base-operation.js').OperationContext} context - Operation context
   */
  constructor(filePath, options, context) {
    super(filePath, context);
    this.options = options;
    this.originalContent = null;
    this.insertPosition = null;
  }

  get type() {
    return 'insert';
  }

  /**
   * Validates the insert operation
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async validate() {
    const { content } = this.options;

    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Content is required for insert' };
    }

    // Validate position options
    const hasLine = this.options.atLine !== undefined;
    const hasAfter = this.options.after !== undefined;
    const hasBefore = this.options.before !== undefined;
    const hasEnd = this.options.atEnd;

    if ([hasLine, hasAfter, hasBefore, hasEnd].filter(Boolean).length > 1) {
      return { valid: false, error: 'Only one position option allowed' };
    }

    // If using after/before, we need to check file exists and contains pattern
    if (hasAfter || hasBefore) {
      try {
        const absolutePath = await this._getAbsolutePath();
        const fileContent = await fs.readFile(absolutePath, 'utf-8');
        const pattern = hasAfter ? this.options.after : this.options.before;
        
        if (!fileContent.includes(pattern)) {
          return { valid: false, error: `Pattern not found: ${pattern.substring(0, 50)}...` };
        }
      } catch (error) {
        return { valid: false, error: `Cannot read file: ${error.message}` };
      }
    }

    return { valid: true };
  }

  /**
   * Prepares undo data
   * @returns {Promise<Object>}
   */
  async prepareUndo() {
    return {
      content: this.originalContent,
      position: this.insertPosition
    };
  }

  /**
   * Executes the insert operation
   * @returns {Promise<import('./base-operation.js').OperationResult>}
   */
  async execute() {
    try {
      const absolutePath = await this._getAbsolutePath();
      
      // Read current content
      this.originalContent = await fs.readFile(absolutePath, 'utf-8');
      
      // Calculate insertion position and new content
      const { newContent, position } = this._calculateInsertion(this.originalContent);
      this.insertPosition = position;
      
      // Write new content
      await fs.writeFile(absolutePath, newContent, 'utf-8');
      
      this._markExecuted(this._createResult(true, {
        position,
        insertedLength: this.options.content.length
      }));

      this._emit('operation:insert:executed', {
        file: this.filePath,
        position,
        length: this.options.content.length
      });

      return this.result;

    } catch (error) {
      return this._createResult(false, {}, error);
    }
  }

  /**
   * Undoes the insert operation
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
   * Calculates insertion position and new content
   * @private
   * @param {string} content - Original file content
   * @returns {{newContent: string, position: {line: number, column: number}}}
   */
  _calculateInsertion(content) {
    const { atLine, after, before, atEnd, content: insertContent } = this.options;
    let newContent = content;
    let position = { line: 0, column: 0 };

    if (atLine !== undefined) {
      // Insert at specific line
      const lines = content.split('\n');
      const insertIndex = Math.max(0, Math.min(atLine - 1, lines.length));
      lines.splice(insertIndex, 0, insertContent);
      newContent = lines.join('\n');
      position = { line: atLine, column: 0 };

    } else if (after !== undefined) {
      // Insert after pattern
      const index = content.indexOf(after);
      if (index !== -1) {
        const insertIndex = index + after.length;
        newContent = content.slice(0, insertIndex) + insertContent + content.slice(insertIndex);
        position = this._getPositionFromIndex(content, insertIndex);
      }

    } else if (before !== undefined) {
      // Insert before pattern
      const index = content.indexOf(before);
      if (index !== -1) {
        newContent = content.slice(0, index) + insertContent + content.slice(index);
        position = this._getPositionFromIndex(content, index);
      }

    } else {
      // Insert at end (default)
      const needsNewline = content.length > 0 && !content.endsWith('\n');
      newContent = content + (needsNewline ? '\n' : '') + insertContent;
      const lines = content.split('\n');
      position = { line: lines.length, column: lines[lines.length - 1]?.length || 0 };
    }

    return { newContent, position };
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

  async _getAbsolutePath() {
    const { path } = await import('path');
    return path.join(this.context.projectPath, this.filePath);
  }
}

/**
 * Factory function for insert operation
 * @param {string} filePath - Target file path
 * @param {InsertOptions} options - Insert options
 * @param {import('./base-operation.js').OperationContext} context - Operation context
 * @returns {InsertOperation}
 */
export function createInsertOperation(filePath, options, context) {
  return new InsertOperation(filePath, options, context);
}

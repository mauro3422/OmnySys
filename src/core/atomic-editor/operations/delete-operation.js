/**
 * @fileoverview Delete Operation
 * 
 * Deletes content by string match, line range, or pattern.
 * Supports atomic deletion with undo preparation.
 * 
 * @module atomic-editor/operations/delete-operation
 */

import { BaseOperation } from './base-operation.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * @typedef {Object} DeleteOptions
 * @property {string} [content] - Exact content to delete
 * @property {number} [fromLine] - Start line for range deletion
 * @property {number} [toLine] - End line for range deletion
 * @property {string} [pattern] - Regex pattern to delete
 * @property {boolean} [multiline=false] - Whether pattern is multiline
 */

export class DeleteOperation extends BaseOperation {
  /**
   * @param {string} filePath - Target file path
   * @param {DeleteOptions} options - Delete options
   * @param {import('./base-operation.js').OperationContext} context - Operation context
   */
  constructor(filePath, options, context) {
    super(filePath, context);
    this.options = options;
    this.originalContent = null;
    this.deletedContent = null;
    this.deletePosition = null;
  }

  get type() {
    return 'delete';
  }

  /**
   * Validates the delete operation
   * @returns {Promise<{valid: boolean, error?: string}>}
   */
  async validate() {
    const { content, fromLine, toLine, pattern } = this.options;

    // Must have exactly one deletion method
    const methods = [content, fromLine !== undefined, pattern].filter(Boolean);
    if (methods.length !== 1) {
      return { valid: false, error: 'Exactly one deletion method required (content, fromLine, or pattern)' };
    }

    try {
      const absolutePath = await this._getAbsolutePath();
      const fileContent = await fs.readFile(absolutePath, 'utf-8');

      // Validate content exists
      if (content !== undefined && !fileContent.includes(content)) {
        return { valid: false, error: `Content not found: ${content.substring(0, 50)}...` };
      }

      // Validate line range
      if (fromLine !== undefined) {
        const lines = fileContent.split('\n');
        if (fromLine < 1 || fromLine > lines.length) {
          return { valid: false, error: `Invalid fromLine: ${fromLine}` };
        }
        const endLine = toLine || fromLine;
        if (endLine < fromLine || endLine > lines.length) {
          return { valid: false, error: `Invalid toLine: ${endLine}` };
        }
      }

      // Validate pattern
      if (pattern !== undefined) {
        try {
          const flags = this.options.multiline ? 'gm' : 'g';
          const regex = new RegExp(pattern, flags);
          if (!regex.test(fileContent)) {
            return { valid: false, error: `Pattern not found: ${pattern}` };
          }
        } catch (e) {
          return { valid: false, error: `Invalid regex pattern: ${e.message}` };
        }
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
      deleted: this.deletedContent,
      position: this.deletePosition
    };
  }

  /**
   * Executes the delete operation
   * @returns {Promise<import('./base-operation.js').OperationResult>}
   */
  async execute() {
    try {
      const absolutePath = await this._getAbsolutePath();
      
      // Read current content
      this.originalContent = await fs.readFile(absolutePath, 'utf-8');
      
      // Calculate deletion and new content
      const { newContent, deleted, position } = this._calculateDeletion(this.originalContent);
      this.deletedContent = deleted;
      this.deletePosition = position;
      
      // Write new content
      await fs.writeFile(absolutePath, newContent, 'utf-8');
      
      this._markExecuted(this._createResult(true, {
        position,
        deletedLength: deleted.length,
        deletedLines: deleted.split('\n').length
      }));

      this._emit('operation:delete:executed', {
        file: this.filePath,
        position,
        length: deleted.length
      });

      return this.result;

    } catch (error) {
      return this._createResult(false, {}, error);
    }
  }

  /**
   * Undoes the delete operation
   * @param {Object} undoData - Undo data from prepareUndo
   * @returns {Promise<import('./base-operation.js').OperationResult>}
   */
  async undo(undoData) {
    try {
      const absolutePath = await this._getAbsolutePath();
      
      // Restore original content
      await fs.writeFile(absolutePath, undoData.content, 'utf-8');
      
      return this._createResult(true, { undone: true, restored: undoData.deleted });
    } catch (error) {
      return this._createResult(false, { undone: false }, error);
    }
  }

  /**
   * Calculates deletion and new content
   * @private
   * @param {string} content - Original file content
   * @returns {{newContent: string, deleted: string, position: {line: number, column: number}}}
   */
  _calculateDeletion(content) {
    const { content: deleteContent, fromLine, toLine, pattern, multiline } = this.options;
    let newContent = content;
    let deleted = '';
    let position = { line: 0, column: 0 };

    if (deleteContent !== undefined) {
      // Delete by exact content
      const index = content.indexOf(deleteContent);
      if (index !== -1) {
        deleted = deleteContent;
        newContent = content.slice(0, index) + content.slice(index + deleteContent.length);
        position = this._getPositionFromIndex(content, index);
      }

    } else if (fromLine !== undefined) {
      // Delete by line range
      const lines = content.split('\n');
      const startIndex = fromLine - 1;
      const endIndex = (toLine || fromLine);
      
      deleted = lines.slice(startIndex, endIndex).join('\n');
      lines.splice(startIndex, endIndex - startIndex);
      newContent = lines.join('\n');
      position = { line: fromLine, column: 0 };

    } else if (pattern !== undefined) {
      // Delete by pattern
      const flags = multiline ? 'gm' : 'g';
      const regex = new RegExp(pattern, flags);
      
      // Find first match for position
      const match = content.match(regex);
      if (match) {
        const matchIndex = content.search(regex);
        deleted = match[0];
        newContent = content.replace(regex, '');
        position = this._getPositionFromIndex(content, matchIndex);
      }
    }

    return { newContent, deleted, position };
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

  _getAbsolutePath() {
    return path.join(this.context.projectPath, this.filePath);
  }
}

/**
 * Factory function for delete operation
 * @param {string} filePath - Target file path
 * @param {DeleteOptions} options - Delete options
 * @param {import('./base-operation.js').OperationContext} context - Operation context
 * @returns {DeleteOperation}
 */
export function createDeleteOperation(filePath, options, context) {
  return new DeleteOperation(filePath, options, context);
}

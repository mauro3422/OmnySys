/**
 * @fileoverview Modify Operation
 *
 * Replaces content in a file. This is the core atomic edit operation
 * that replaces oldString with newString while maintaining atomicity.
 *
 * @module atomic-editor/operations/modify-operation
 */

import fs from 'fs/promises';
import { createLogger } from '#utils/logger.js';
import { BaseOperation } from './base-operation.js';
import {
  calculateModification,
  extractRange,
  getFilePreview,
  loadSymbolRange,
  resolveAbsolutePath,
  generateSuggestions
} from './modify-operation-helpers.js';

const logger = createLogger('OmnySys:atomic-editor:modify-operation');

/**
 * @typedef {Object} ModifyOptions
 * @property {string} oldString - Content to replace
 * @property {string} newString - New content
 * @property {boolean} [all=false] - Replace all occurrences
 */

export class ModifyOperation extends BaseOperation {
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

  async validate() {
    const { oldString, newString, symbolName } = this.options;

    if (oldString === undefined && symbolName === undefined) {
      return { valid: false, error: 'Either oldString or symbolName is required for modify' };
    }

    if (newString === undefined) {
      return { valid: false, error: 'newString is required for modify' };
    }

    try {
      const absolutePath = resolveAbsolutePath(this.context, this.filePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');

      let targetContent = fileContent;
      if (symbolName) {
        const atomRange = await loadSymbolRange(this.context, this.filePath, symbolName, logger);
        if (atomRange) {
          targetContent = extractRange(fileContent, atomRange);
        } else {
          return { valid: false, error: `Symbol "${symbolName}" not found in index for ${this.filePath}` };
        }
      }

      if (oldString && !targetContent.includes(oldString)) {
        const suggestions = generateSuggestions(oldString, targetContent, fileContent);

        return {
          valid: false,
          error: `oldString not found${symbolName ? ` in symbol "${symbolName}"` : ''}`,
          help: {
            whatYouProvided: oldString.substring(0, 100) + (oldString.length > 100 ? '...' : ''),
            suggestions,
            filePreview: getFilePreview(fileContent, oldString),
            recommendation: suggestions.length > 0
              ? 'Use one of the suggested strings above, or read the file first to see the exact content'
              : 'Read the file first to see the exact content that needs to be replaced'
          }
        };
      }

      if (oldString) {
        const matches = targetContent.split(oldString).length - 1;
        if (matches > 1 && !this.options.all) {
          return {
            valid: false,
            error: `Multiple matches (${matches}) found${symbolName ? ` in symbol "${symbolName}"` : ''}. Use all:true to replace all`
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Validation failed: ${error.message}` };
    }
  }

  async prepareUndo() {
    return {
      content: this.originalContent,
      oldString: this.options.newString,
      newString: this.options.oldString,
      position: this.matchPosition
    };
  }

  async execute() {
    try {
      const absolutePath = resolveAbsolutePath(this.context, this.filePath);
      this.originalContent = await fs.readFile(absolutePath, 'utf-8');

      const { newContent, position, replacements } = await calculateModification(
        this.originalContent,
        this.options,
        this.filePath,
        this.context,
        logger
      );

      this.modifiedContent = newContent;
      this.matchPosition = position;

      await fs.writeFile(absolutePath, newContent, 'utf-8');

      this._markExecuted(this._createResult(true, {
        position,
        replacements,
        addedLength: this.options.newString.length,
        removedLength: this.options.oldString ? this.options.oldString.length : 0,
        netChange: this.options.newString.length - (this.options.oldString ? this.options.oldString.length : 0)
      }));

      this._emit('operation:modify:executed', {
        file: this.filePath,
        symbol: this.options.symbolName,
        position,
        replacements,
        netChange: this.options.newString.length - (this.options.oldString ? this.options.oldString.length : 0)
      });

      return this.result;
    } catch (error) {
      return this._createResult(false, {}, error);
    }
  }

  async undo(undoData) {
    try {
      const absolutePath = resolveAbsolutePath(this.context, this.filePath);
      await fs.writeFile(absolutePath, undoData.content, 'utf-8');
      return this._createResult(true, { undone: true });
    } catch (error) {
      return this._createResult(false, { undone: false }, error);
    }
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

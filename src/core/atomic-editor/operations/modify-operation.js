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

  /**
   * Extrae metadata del átomo desde la DB para validación de fragmentos
   */
  async extractAtomMetadata() {
    const { symbolName, filePath } = this.options;
    if (!symbolName) return null;

    try {
      const { getRepository } = await import('../../../layer-c-memory/storage/repository/repository-factory.js');
      const repo = getRepository(this.context.projectPath);

      const query = `
        SELECT lineStart, lineEnd, name,
               json_extract(dna_json, '$.signature') as signature,
               json_extract(dna_json, '$.semanticFingerprint') as semanticFingerprint,
               atom_type
        FROM atoms
        WHERE file_path = ?
          AND name = ?
          AND (is_removed IS NULL OR is_removed = 0)
        LIMIT 1
      `;

      const normalizedPath = filePath.replace(/\\/g, '/');
      const row = repo.db.prepare(query).get(normalizedPath, symbolName);

      if (!row) return null;

      return {
        lineStart: row.lineStart,
        lineEnd: row.lineEnd,
        name: row.name,
        signature: row.signature ? JSON.parse(row.signature) : null,
        semanticFingerprint: row.semanticFingerprint,
        atomType: row.atom_type
      };
    } catch (err) {
      return null;
    }
  }

  async execute() {
    try {
      // Step 1: Read file content
      const absolutePath = resolveAbsolutePath(this.context, this.filePath);
      this.originalContent = await fs.readFile(absolutePath, 'utf-8');

      // Step 2: Extract atom metadata for fragment-aware replacement
      const atomMetadata = await this.extractAtomMetadata();
      logger.info(`[ModifyOperation-v2] execute() called for ${this.filePath}, strategy=${this.options.replacementStrategy}, hasMeta=${!!atomMetadata}`);

      // Step 3: Perform the modification (transform content)
      let strategy;
      let newContent;
      let position;
      let replacements;

      if (this.options.replacementStrategy === 'replace-body' && atomMetadata) {
        // FRAGMENT MODE: Replace only the function body, preserving signature
        this.options.atomMetadata = atomMetadata;
        const lines = this.originalContent.split('\n');
        const startIdx = atomMetadata.lineStart - 1;
        const endIdx = atomMetadata.lineEnd - 1;
        const functionLines = lines.slice(startIdx, endIdx + 1);
        const fullFunctionText = functionLines.join('\n');

        const openBraceIdx = fullFunctionText.indexOf('{');
        const closeBraceIdx = fullFunctionText.lastIndexOf('}');

        logger.info(`[ModifyOperation-v2] FRAGMENT MODE: ${atomMetadata.name} lines ${atomMetadata.lineStart}-${atomMetadata.lineEnd}`);
        logger.info(`[ModifyOperation-v2] Function text (${functionLines.length} lines): "${fullFunctionText.substring(0, 80)}..."`);

        if (openBraceIdx !== -1 && closeBraceIdx !== -1) {
          const signaturePart = fullFunctionText.substring(0, openBraceIdx + 1);
          const newFunction = `${signaturePart}\n  ${this.options.newString.trim()}\n}`;
          lines.splice(startIdx, endIdx - startIdx + 1, newFunction);
          newContent = lines.join('\n');
          position = { line: atomMetadata.lineStart, column: 0 };
          replacements = 1;
          strategy = 'replace-body';
        } else {
          // Fallback to standard modification
          logger.warn('[ModifyOperation-v2] Fragment braces not found, falling back to standard mode');
          const result = await calculateModification(this.originalContent, this.options, this.filePath, this.context, logger);
          newContent = result.newContent;
          position = result.position;
          replacements = result.replacements;
          strategy = 'standard-fallback';
        }
      } else {
        // STANDARD MODE: full content replacement
        const result = await calculateModification(this.originalContent, this.options, this.filePath, this.context, logger);
        newContent = result.newContent;
        position = result.position;
        replacements = result.replacements;
        strategy = 'standard';
      }

      // Step 4: Write modified content and record result
      this.modifiedContent = newContent;
      this.matchPosition = position;

      await fs.writeFile(absolutePath, newContent, 'utf-8');

      const delta = {
        strategy,
        position,
        replacements,
        addedLength: this.options.newString.length,
        removedLength: this.options.oldString ? this.options.oldString.length : 0,
        netChange: this.options.newString.length - (this.options.oldString ? this.options.oldString.length : 0)
      };

      this._markExecuted(this._createResult(true, delta));
      this._emit('operation:modify:executed', {
        file: this.filePath,
        symbol: this.options.symbolName,
        ...delta
      });

      return { ...this.result, delta };
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

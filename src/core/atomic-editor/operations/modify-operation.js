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
import path from 'path';

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
    const { oldString, newString, symbolName } = this.options;

    if (oldString === undefined && symbolName === undefined) {
      return { valid: false, error: 'Either oldString or symbolName is required for modify' };
    }

    if (newString === undefined) {
      return { valid: false, error: 'newString is required for modify' };
    }

    try {
      const absolutePath = await this._getAbsolutePath();
      const fileContent = await fs.readFile(absolutePath, 'utf-8');

      // If symbolName is provided, we can be more precise
      let targetContent = fileContent;
      if (symbolName) {
        const atomRange = await this._getSymbolRange(symbolName);
        if (atomRange) {
          targetContent = this._extractRange(fileContent, atomRange);
        } else {
          return { valid: false, error: `Symbol "${symbolName}" not found in index for ${this.filePath}` };
        }
      }

      // If oldString is provided, it MUST exist in the target content
      if (oldString && !targetContent.includes(oldString)) {
        const suggestions = this._generateSuggestions(oldString, targetContent, fileContent);
        
        return {
          valid: false,
          error: `oldString not found${symbolName ? ` in symbol "${symbolName}"` : ''}`,
          help: {
            whatYouProvided: oldString.substring(0, 100) + (oldString.length > 100 ? '...' : ''),
            suggestions,
            filePreview: this._getFilePreview(fileContent, oldString),
            recommendation: suggestions.length > 0 
              ? 'Use one of the suggested strings above, or read the file first to see the exact content'
              : 'Read the file first to see the exact content that needs to be replaced'
          }
        };
      }

      // Validate multiple matches when not using 'all'
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
      const { newContent, position, replacements } = await this._calculateModification(this.originalContent);
      this.modifiedContent = newContent;
      this.matchPosition = position;

      // Write new content
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
   * @returns {Promise<{newContent: string, position: {line: number, column: number}, replacements: number}>}
   */
  async _calculateModification(content) {
    const { oldString, newString, all, symbolName } = this.options;

    let newContent = content;
    let position = { line: 0, column: 0 };
    let replacements = 0;

    // Use AST targeting if symbolName is provided
    if (symbolName) {
      const atomRange = await this._getSymbolRange(symbolName);
      if (atomRange) {
        const lines = content.split('\n');
        const startIdx = this._getIndexFromPosition(lines, atomRange.startLine, 0);
        const endIdx = this._getIndexFromPosition(lines, atomRange.endLine + 1, 0);

        const prefix = content.slice(0, startIdx);
        const target = content.slice(startIdx, endIdx);
        const suffix = content.slice(endIdx);

        if (oldString) {
          // Replace within the symbol's code
          if (all) {
            const regex = new RegExp(this._escapeRegex(oldString), 'g');
            const matches = target.match(regex);
            replacements = matches ? matches.length : 0;
            newContent = prefix + target.replace(regex, newString) + suffix;
            position = { line: atomRange.startLine, column: 0 };
          } else {
            const matchIdx = target.indexOf(oldString);
            if (matchIdx !== -1) {
              replacements = 1;
              newContent = prefix + target.slice(0, matchIdx) + newString + target.slice(matchIdx + oldString.length) + suffix;
              position = this._getPositionFromIndex(content, startIdx + matchIdx);
            }
          }
        } else {
          // Replace the ENTIRE symbol
          replacements = 1;
          newContent = prefix + newString + suffix;
          position = { line: atomRange.startLine, column: 0 };
        }

        return { newContent, position, replacements };
      }
    }

    // Fallback to legacy string replacement
    if (all) {
      const regex = new RegExp(this._escapeRegex(oldString), 'g');
      const matches = content.match(regex);
      replacements = matches ? matches.length : 0;
      const firstIndex = content.indexOf(oldString);
      if (firstIndex !== -1) position = this._getPositionFromIndex(content, firstIndex);
      newContent = content.replace(regex, newString);
    } else {
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
   * Obtiene el rango de líneas de un símbolo usando el índice
   * @private
   */
  async _getSymbolRange(symbolName) {
    try {
      // Intentar cargar desde el índice (SQLite)
      // Nota: Aquí solemos usar loadAtoms del storage
      const { loadAtoms } = await import('../../../layer-c-memory/storage/index.js');
      const atoms = await loadAtoms(this.context.projectPath, this.filePath);
      const atom = atoms.find(a => a.name === symbolName);

      if (atom && atom.line !== undefined) {
        return {
          startLine: atom.line,
          endLine: atom.line + (atom.linesOfCode || 1) - 1
        };
      }
    } catch (e) {
      logger.warn(`Could not get symbol range for ${symbolName}: ${e.message}`);
    }
    return null;
  }

  /**
   * Extrae un rango de líneas del contenido
   * @private
   */
  _extractRange(content, range) {
    const lines = content.split('\n');
    return lines.slice(range.startLine - 1, range.endLine).join('\n');
  }

  /**
   * Convierte posición (línea, col) a índice de char
   * @private
   */
  _getIndexFromPosition(lines, line, col) {
    let index = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      index += lines[i].length + 1; // +1 por \n
    }
    return index + col;
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

  _getAbsolutePath() {
    return path.join(this.context.projectPath, this.filePath);
  }

  /**
   * Genera sugerencias cuando oldString no se encuentra exacto
   * Busca substrings similares usando heurísticas de matching
   * @private
   */
  _generateSuggestions(oldString, targetContent, fullContent) {
    const suggestions = [];
    const oldTrimmed = oldString.trim();
    
    // 1. Buscar ignorando whitespace al inicio/final
    const lines = targetContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === oldTrimmed) {
        suggestions.push({
          type: 'WHITESPACE_MISMATCH',
          confidence: 'high',
          line: i + 1,
          suggestedString: line,
          reason: 'Same content but different indentation/whitespace'
        });
      }
    }
    
    // 2. Buscar primera línea del oldString
    const oldFirstLine = oldTrimmed.split('\n')[0];
    if (oldFirstLine) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(oldFirstLine)) {
          // Encontramos una línea similar, extraer contexto
          const contextLines = lines.slice(i, i + oldTrimmed.split('\n').length);
          const contextString = contextLines.join('\n');
          
          if (contextString.length > 0 && contextString !== oldString) {
            suggestions.push({
              type: 'CONTEXT_MATCH',
              confidence: 'medium',
              line: i + 1,
              suggestedString: contextString,
              reason: `Found "${oldFirstLine.substring(0, 30)}..." at line ${i + 1}`
            });
          }
          
          // Solo mostrar las primeras 3 coincidencias
          if (suggestions.length >= 5) break;
        }
      }
    }
    
    // 3. Buscar con fuzzy matching (primeros 50 chars)
    const oldStart = oldTrimmed.substring(0, 50);
    if (targetContent.includes(oldStart)) {
      const idx = targetContent.indexOf(oldStart);
      const linesBefore = targetContent.substring(0, idx).split('\n').length;
      suggestions.push({
        type: 'PARTIAL_MATCH',
        confidence: 'medium',
        line: linesBefore,
        suggestedString: targetContent.substring(idx, idx + Math.min(oldString.length, 200)),
        reason: 'Content starts similarly but differs later'
      });
    }
    
    return suggestions.slice(0, 5); // Máximo 5 sugerencias
  }
  
  /**
   * Extrae un preview del archivo mostrando dónde podría estar el contenido similar
   * @private
   */
  _getFilePreview(fileContent, oldString) {
    const lines = fileContent.split('\n');
    const oldFirstLine = oldString.split('\n')[0].trim();
    
    // Buscar líneas que contengan parte del inicio del oldString
    let targetLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (oldFirstLine.length > 10 && lines[i].includes(oldFirstLine.substring(0, 20))) {
        targetLine = i;
        break;
      }
    }
    
    // Si no encontramos, mostrar primeras líneas
    if (targetLine === -1) {
      return lines.slice(0, 30).map((l, i) => `${i + 1}: ${l}`).join('\n');
    }
    
    // Mostrar contexto alrededor de la línea encontrada
    const start = Math.max(0, targetLine - 5);
    const end = Math.min(lines.length, targetLine + 25);
    
    return lines.slice(start, end).map((l, i) => `${start + i + 1}: ${l}`).join('\n');
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

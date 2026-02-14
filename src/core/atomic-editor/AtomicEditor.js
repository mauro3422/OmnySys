/**
 * @fileoverview AtomicEditor.js
 * 
 * Main Atomic Editor class implementing the Command pattern.
 * Coordinates validation and execution of atomic editing operations.
 * 
 * Features:
 * - Command pattern for operations
 * - Validation before execution
 * - Atomicity guarantees
 * - Undo/redo support preparation
 * - Event emission for system integration
 * 
 * @module atomic-editor/AtomicEditor
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger.js';
import { SyntaxValidator, SafetyValidator } from './validators/index.js';
import { ModifyOperation, InsertOperation, DeleteOperation } from './operations/index.js';

const logger = createLogger('OmnySys:atomic:editor');

/**
 * Editor Atómico - Conecta ediciones con el sistema de átomos
 * @extends EventEmitter
 */
export class AtomicEditor extends EventEmitter {
  /**
   * @param {string} projectPath - Project base path
   * @param {Object} [orchestrator] - System orchestrator
   * @param {Object} [options] - Editor options
   */
  constructor(projectPath, orchestrator, options = {}) {
    super();
    this.projectPath = projectPath;
    this.orchestrator = orchestrator;
    this.options = {
      enableUndo: true,
      enableSafetyChecks: true,
      enableSyntaxValidation: true,
      ...options
    };

    // Initialize validators
    this.syntaxValidator = new SyntaxValidator(projectPath);
    this.safetyValidator = new SafetyValidator(projectPath, options.safety);

    // Operation history for undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistorySize = options.maxHistorySize || 50;
  }

  /**
   * Edits a file with full atomic validation
   * 
   * @param {string} filePath - Path of file to edit (relative to project)
   * @param {string} oldString - Text to replace
   * @param {string} newString - New text
   * @param {Object} [options] - Operation options
   * @returns {Promise<Object>} - Edit result
   */
  async edit(filePath, oldString, newString, options = {}) {
    logger.info(`📝 Atomic Edit: ${filePath}`);

    const operation = new ModifyOperation(filePath, { oldString, newString }, {
      projectPath: this.projectPath,
      orchestrator: this.orchestrator,
      emit: this.emit.bind(this),
      validators: {
        syntax: this.syntaxValidator,
        safety: this.safetyValidator
      }
    });

    return this._executeOperation(operation, options);
  }

  /**
   * Inserts content into a file
   * 
   * @param {string} filePath - Target file path
   * @param {Object} insertOptions - Insert options (content, atLine, after, before, atEnd)
   * @param {Object} [options] - Operation options
   * @returns {Promise<Object>} - Insert result
   */
  async insert(filePath, insertOptions, options = {}) {
    logger.info(`📥 Atomic Insert: ${filePath}`);

    const operation = new InsertOperation(filePath, insertOptions, {
      projectPath: this.projectPath,
      orchestrator: this.orchestrator,
      emit: this.emit.bind(this),
      validators: {
        syntax: this.syntaxValidator,
        safety: this.safetyValidator
      }
    });

    return this._executeOperation(operation, options);
  }

  /**
   * Deletes content from a file
   * 
   * @param {string} filePath - Target file path
   * @param {Object} deleteOptions - Delete options (content, fromLine, toLine, pattern)
   * @param {Object} [options] - Operation options
   * @returns {Promise<Object>} - Delete result
   */
  async delete(filePath, deleteOptions, options = {}) {
    logger.info(`🗑️ Atomic Delete: ${filePath}`);

    const operation = new DeleteOperation(filePath, deleteOptions, {
      projectPath: this.projectPath,
      orchestrator: this.orchestrator,
      emit: this.emit.bind(this),
      validators: {
        syntax: this.syntaxValidator,
        safety: this.safetyValidator
      }
    });

    return this._executeOperation(operation, options);
  }

  /**
   * Writes a new file with validation
   * 
   * @param {string} filePath - Target file path
   * @param {string} content - Content to write
   * @param {Object} [options] - Write options
   * @returns {Promise<Object>} - Write result
   */
  async write(filePath, content, options = {}) {
    logger.info(`📝 Atomic Write: ${filePath}`);

    // Validate safety first
    if (this.options.enableSafetyChecks) {
      const safety = await this.safetyValidator.validateWrite(filePath, content);
      if (!safety.safe) {
        this.emit('atom:validation:failed', {
          file: filePath,
          error: safety.error,
          isNewFile: true
        });
        throw new Error(`Safety check failed: ${safety.error}`);
      }
    }

    // Validate syntax
    if (this.options.enableSyntaxValidation && filePath.match(/\.(js|ts|mjs|cjs)$/)) {
      logger.info(`  🔍 Validating syntax...`);
      const validation = await this.syntaxValidator.validate(filePath, content);
      
      if (!validation.valid) {
        this.emit('atom:validation:failed', {
          file: filePath,
          error: validation.error,
          line: validation.line,
          column: validation.column,
          isNewFile: true
        });
        
        logger.error(`  ❌ SYNTAX ERROR in ${filePath}:`);
        logger.error(`     ${validation.error}`);
        throw new Error(`Syntax error prevents write: ${validation.error}`);
      }
      
      logger.info(`  ✅ Syntax valid`);
    }

    // Write file directly (insert operation for new files)
    const fs = await import('fs/promises');
    const { path } = await import('path');
    const absolutePath = path.join(this.projectPath, filePath);
    
    await fs.writeFile(absolutePath, content, 'utf-8');

    // Update atom
    await this._updateAtom(filePath, content, {
      affectedFiles: [],
      changedSymbols: [],
      severity: 'low'
    });

    this.emit('atom:created', {
      file: filePath,
      timestamp: Date.now()
    });

    logger.info(`  ✅ Atomic write complete`);

    return { success: true, file: filePath };
  }

  /**
   * Executes an operation with full lifecycle
   * @private
   * @param {import('./operations/base-operation.js').BaseOperation} operation - Operation to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>}
   */
  async _executeOperation(operation, options = {}) {
    const skipValidation = options.skipValidation || false;
    const skipSafety = options.skipSafety || false;

    try {
      // Phase 1: Safety validation
      if (this.options.enableSafetyChecks && !skipSafety) {
        logger.info(`  🔒 Validating safety...`);
        const safety = await this.safetyValidator.validateEdit(operation.filePath, {
          oldString: operation.options?.oldString,
          newString: operation.options?.newString
        });
        
        if (!safety.safe) {
          throw new Error(`Safety check failed: ${safety.error}`);
        }
        logger.info(`  ✅ Safety passed`);
      }

      // Phase 2: Operation-specific validation
      if (!skipValidation) {
        logger.info(`  🔍 Validating operation...`);
        const validation = await operation.validate();
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.error}`);
        }
        logger.info(`  ✅ Operation valid`);
      }

      // Phase 3: Syntax validation (if JS/TS)
      if (this.options.enableSyntaxValidation && operation.options?.newString) {
        const ext = operation.filePath.match(/\.[^.]+$/);
        if (ext && ['.js', '.ts', '.mjs', '.cjs'].includes(ext[0])) {
          logger.info(`  🔍 Validating syntax...`);
          const syntax = await this.syntaxValidator.validate(
            operation.filePath,
            await this._getModifiedContent(operation)
          );
          
          if (!syntax.valid) {
            this.emit('atom:validation:failed', {
              file: operation.filePath,
              error: syntax.error,
              line: syntax.line,
              column: syntax.column,
              severity: 'critical'
            });
            
            logger.error(`  ❌ SYNTAX ERROR:`);
            logger.error(`     ${syntax.error}`);
            logger.error(`     Line ${syntax.line}, Column ${syntax.column}`);
            
            throw new Error(`Syntax error prevents edit: ${syntax.error}`);
          }
          logger.info(`  ✅ Syntax valid`);
        }
      }

      // Phase 4: Prepare undo
      let undoData = null;
      if (this.options.enableUndo) {
        undoData = await operation.prepareUndo();
      }

      // Phase 5: Execute
      logger.info(`  ⚡ Executing ${operation.type}...`);
      const result = await operation.execute();

      if (!result.success) {
        throw result.error || new Error('Operation failed');
      }

      // Phase 6: Update history
      if (this.options.enableUndo) {
        this._addToHistory(operation, undoData);
      }

      // Phase 7: Post-execution (atom updates, propagation)
      await this._postExecute(operation, result);

      logger.info(`  ✅ Operation complete`);
      return result;

    } catch (error) {
      this.emit('atom:edit:failed', {
        file: operation.filePath,
        operation: operation.type,
        error: error.message,
        timestamp: Date.now()
      });
      
      logger.error(`  ❌ Operation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets the modified content for syntax validation
   * @private
   */
  async _getModifiedContent(operation) {
    const fs = await import('fs/promises');
    const { path } = await import('path');
    const absolutePath = path.join(this.projectPath, operation.filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    
    if (operation.type === 'modify') {
      return content.replace(operation.options.oldString, operation.options.newString);
    }
    
    return content;
  }

  /**
   * Post-execution updates
   * @private
   */
  async _postExecute(operation, result) {
    // Update atom
    await this._updateAtom(operation.filePath, null, {
      affectedFiles: [],
      changedSymbols: [],
      severity: 'low'
    });

    // Emit success event
    this.emit('atom:modified', {
      file: operation.filePath,
      operation: operation.type,
      changes: result,
      timestamp: Date.now()
    });
  }

  /**
   * Adds operation to history
   * @private
   */
  _addToHistory(operation, undoData) {
    // Remove any redo entries
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add new entry
    this.history.push({
      operation,
      undoData,
      timestamp: Date.now()
    });
    
    this.historyIndex++;
    
    // Trim history if needed
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Undoes the last operation
   * @returns {Promise<Object>}
   */
  async undo() {
    if (this.historyIndex < 0) {
      return { success: false, error: 'Nothing to undo' };
    }

    const entry = this.history[this.historyIndex];
    
    if (!entry.undoData) {
      return { success: false, error: 'Undo not available for this operation' };
    }

    logger.info(`↩️  Undoing ${entry.operation.type}...`);
    
    const result = await entry.operation.undo(entry.undoData);
    
    if (result.success) {
      this.historyIndex--;
      this.emit('operation:undone', {
        operation: entry.operation.type,
        file: entry.operation.filePath,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * Redoes the last undone operation
   * @returns {Promise<Object>}
   */
  async redo() {
    if (this.historyIndex >= this.history.length - 1) {
      return { success: false, error: 'Nothing to redo' };
    }

    const entry = this.history[this.historyIndex + 1];
    
    logger.info(`↪️  Redoing ${entry.operation.type}...`);
    
    const result = await entry.operation.execute();
    
    if (result.success) {
      this.historyIndex++;
      this.emit('operation:redone', {
        operation: entry.operation.type,
        file: entry.operation.filePath,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * Gets history info
   * @returns {{canUndo: boolean, canRedo: boolean, count: number}}
   */
  getHistoryInfo() {
    return {
      canUndo: this.historyIndex >= 0,
      canRedo: this.historyIndex < this.history.length - 1,
      count: this.history.length,
      currentIndex: this.historyIndex
    };
  }

  /**
   * Updates the atom in the system
   * @private
   */
  async _updateAtom(filePath, content, impact) {
    try {
      if (this.orchestrator) {
        await this.orchestrator.handleFileChange?.(filePath, 'modified', {
          skipDebounce: true,
          priority: 'critical'
        });
      }

      // Invalidate cache
      const { getUnifiedCache } = await import('#core/unified-cache-manager.js');
      const cache = getUnifiedCache(this.projectPath);
      
      if (cache) {
        cache.invalidate(`analysis:${filePath}`);
        cache.invalidate(`atom:${filePath}`);
      }
    } catch (error) {
      logger.warn(`  ⚠️  Could not update atom: ${error.message}`);
    }
  }
}

// Singleton management
let atomicEditor = null;

/**
 * Gets or creates the atomic editor singleton
 * @param {string} projectPath - Project path
 * @param {Object} [orchestrator] - System orchestrator
 * @param {Object} [options] - Editor options
 * @returns {AtomicEditor}
 */
export function getAtomicEditor(projectPath, orchestrator, options) {
  if (!atomicEditor) {
    atomicEditor = new AtomicEditor(projectPath, orchestrator, options);
  }
  return atomicEditor;
}

/**
 * Resets the atomic editor singleton
 */
export function resetAtomicEditor() {
  atomicEditor = null;
}

/**
 * Creates a new atomic editor instance (non-singleton)
 * @param {string} projectPath - Project path
 * @param {Object} [orchestrator] - System orchestrator
 * @param {Object} [options] - Editor options
 * @returns {AtomicEditor}
 */
export function createAtomicEditor(projectPath, orchestrator, options) {
  return new AtomicEditor(projectPath, orchestrator, options);
}

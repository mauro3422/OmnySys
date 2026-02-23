/**
 * @fileoverview AtomicEditor.js
 * 
 * Main Atomic Editor class implementing the Command pattern.
 * Coordinates validation and execution of atomic editing operations.
 * 
 * @module atomic-editor/AtomicEditor
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

import { EventEmitter } from 'events';
import { createLogger } from '../../utils/logger.js';
import { SyntaxValidator, SafetyValidator } from './validators/index.js';
import { ModifyOperation, InsertOperation, DeleteOperation } from './operations/index.js';
import { HistoryManager } from './history/history-manager.js';
import { executeOperation, validateWrite } from './execution/operation-executor.js';
import { updateAtom, emitModificationSuccess, emitAtomCreated } from './utils/atom-updater.js';

const logger = createLogger('OmnySys:atomic:editor');

/**
 * Simple file locking mechanism to prevent race conditions
 * when multiple processes try to write the same file
 */
class FileLockManager {
  constructor() {
    this.locks = new Map();
    this.waiting = new Map();
  }

  async acquire(filePath) {
    while (this.locks.has(filePath)) {
      if (!this.waiting.has(filePath)) {
        this.waiting.set(filePath, []);
      }
      await new Promise(resolve => this.waiting.get(filePath).push(resolve));
    }
    this.locks.set(filePath, Date.now());
  }

  release(filePath) {
    this.locks.delete(filePath);
    const waiters = this.waiting.get(filePath);
    if (waiters && waiters.length > 0) {
      const next = waiters.shift();
      if (next) next();
    }
  }
}

const fileLock = new FileLockManager();

/**
 * Editor Atómico - Conecta ediciones con el sistema de átomos
 * @extends EventEmitter
 */
export class AtomicEditor extends EventEmitter {
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

    // Initialize history manager
    this.history = new HistoryManager(options.maxHistorySize || 50);
  }

  // ==========================================
  // Public API: Edit Operations
  // ==========================================

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

    return this._executeWithHistory(operation, options);
  }

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

    return this._executeWithHistory(operation, options);
  }

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

    return this._executeWithHistory(operation, options);
  }

  async write(filePath, content, options = {}) {
    logger.info(`📝 Atomic Write: ${filePath}`);

    // Acquire lock to prevent race condition
    await fileLock.acquire(filePath);
    
    try {
      // Validate write
      const validation = await validateWrite(filePath, content, {
        syntax: this.syntaxValidator,
        safety: this.safetyValidator
      }, this.options);

      if (!validation.valid) {
        this.emit('atom:validation:failed', {
          file: filePath,
          error: validation.error,
          line: validation.line,
          column: validation.column,
          isNewFile: true
        });
        throw new Error(validation.error);
      }

      // Write file
      const fs = await import('fs/promises');
      const path = await import('path');
      const absolutePath = path.join(this.projectPath, filePath);
      await fs.writeFile(absolutePath, content, 'utf-8');

      // Update atom
      await updateAtom(filePath, this.orchestrator, this.projectPath, {});
      emitAtomCreated(this.emit.bind(this), filePath);

      logger.info(`  ✅ Atomic write complete`);
      return { success: true, file: filePath };
    } finally {
      // Always release lock
      fileLock.release(filePath);
    }
  }

  // ==========================================
  // History: Undo/Redo
  // ==========================================

  async undo() {
    const entry = this.history.getCurrentForUndo();
    
    if (!entry) {
      return { success: false, error: 'Nothing to undo' };
    }

    if (!entry.undoData) {
      return { success: false, error: 'Undo not available for this operation' };
    }

    logger.info(`↩️  Undoing ${entry.operation.type}...`);
    
    const result = await entry.operation.undo(entry.undoData);
    
    if (result.success) {
      this.history.moveBackward();
      this.emit('operation:undone', {
        operation: entry.operation.type,
        file: entry.operation.filePath,
        timestamp: Date.now()
      });
    }

    return result;
  }

  async redo() {
    const entry = this.history.getCurrentForRedo();
    
    if (!entry) {
      return { success: false, error: 'Nothing to redo' };
    }

    logger.info(`↪️  Redoing ${entry.operation.type}...`);
    
    const result = await entry.operation.execute();
    
    if (result.success) {
      this.history.moveForward();
      this.emit('operation:redone', {
        operation: entry.operation.type,
        file: entry.operation.filePath,
        timestamp: Date.now()
      });
    }

    return result;
  }

  getHistoryInfo() {
    return this.history.getInfo();
  }

  // ==========================================
  // Private Methods
  // ==========================================

  async _executeWithHistory(operation, options) {
    const result = await executeOperation(operation, {
      validators: {
        syntax: this.syntaxValidator,
        safety: this.safetyValidator
      },
      enableSafetyChecks: this.options.enableSafetyChecks,
      enableSyntaxValidation: this.options.enableSyntaxValidation,
      enableUndo: this.options.enableUndo,
      emit: this.emit.bind(this),
      getModifiedContent: (op) => this._getModifiedContent(op),
      skipValidation: options.skipValidation,
      skipSafety: options.skipSafety
    });

    // Add to history
    if (this.options.enableUndo && result.undoData) {
      this.history.add(operation, result.undoData);
    }

    // Post-execution updates
    await updateAtom(operation.filePath, this.orchestrator, this.projectPath, {});
    emitModificationSuccess(this.emit.bind(this), operation.filePath, operation.type, result);

    return result;
  }

  async _getModifiedContent(operation) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const absolutePath = path.join(this.projectPath, operation.filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    
    if (operation.type === 'modify') {
      return content.replace(operation.options.oldString, operation.options.newString);
    }
    
    return content;
  }
}

export default AtomicEditor;

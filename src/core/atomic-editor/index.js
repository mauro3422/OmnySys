/**
 * @fileoverview Atomic Editor Module
 * 
 * Atomic code editing system implementing the Command pattern.
 * Provides atomicity guarantees with validation before execution
 * and undo/redo support preparation.
 * 
 * @module atomic-editor
 * 
 * @example
 * ```javascript
 * import { AtomicEditor } from './atomic-editor/index.js';
 * 
 * const editor = new AtomicEditor('/project/path', orchestrator);
 * 
 * // Modify
 * await editor.edit('src/file.js', 'old', 'new');
 * 
 * // Insert
 * await editor.insert('src/file.js', { content: '// new', atEnd: true });
 * 
 * // Delete
 * await editor.delete('src/file.js', { content: '// remove' });
 * 
 * // Undo/Redo
 * await editor.undo();
 * await editor.redo();
 * ```
 */

// Main class
export { 
  AtomicEditor, 
  getAtomicEditor, 
  resetAtomicEditor, 
  createAtomicEditor 
} from './AtomicEditor.js';

// Operations
export {
  BaseOperation,
  InsertOperation,
  createInsertOperation,
  DeleteOperation,
  createDeleteOperation,
  ModifyOperation,
  createModifyOperation
} from './operations/index.js';

// Validators
export {
  SyntaxValidator,
  createSyntaxValidator,
  SafetyValidator,
  createSafetyValidator
} from './validators/index.js';

// Re-export types for TypeScript/JSDoc
/**
 * @typedef {import('./operations/base-operation.js').OperationContext} OperationContext
 * @typedef {import('./operations/base-operation.js').OperationResult} OperationResult
 * @typedef {import('./operations/insert-operation.js').InsertOptions} InsertOptions
 * @typedef {import('./operations/delete-operation.js').DeleteOptions} DeleteOptions
 * @typedef {import('./operations/modify-operation.js').ModifyOptions} ModifyOptions
 * @typedef {import('./validators/syntax-validator.js').ValidationResult} ValidationResult
 * @typedef {import('./validators/safety-validator.js').SafetyResult} SafetyResult
 */

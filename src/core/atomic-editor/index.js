/**
 * @fileoverview Atomic Editor Module
 * 
 * @module atomic-editor
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

// === Core ===
export { AtomicEditor } from './AtomicEditor.js';

// === Operations ===
export {
  ModifyOperation,
  InsertOperation,
  DeleteOperation,
  BaseOperation
} from './operations/index.js';

// === Validators ===
export {
  SyntaxValidator,
  SafetyValidator
} from './validators/index.js';

// === History ===
export { HistoryManager } from './history/index.js';

// === Execution ===
export {
  executeOperation,
  validateWrite
} from './execution/index.js';

// === Utils ===
export {
  updateAtom,
  invalidateCache,
  emitModificationSuccess,
  emitAtomCreated
} from './utils/index.js';

// === Singleton (factory functions) ===
export {
  getAtomicEditor,
  resetAtomicEditor,
  hasAtomicEditor,
  getCurrentEditor
} from './singleton/index.js';

// === Default Export ===
export { AtomicEditor as default } from './AtomicEditor.js';

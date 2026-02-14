/**
 * @fileoverview atomic-editor.js (LEGACY)
 * 
 * ⚠️  DEPRECATED: This file is kept for backward compatibility.
 * 
 * Please use the new modular structure:
 * ```javascript
 * import { AtomicEditor } from './atomic-editor/index.js';
 * ```
 * 
 * Or specific modules:
 * ```javascript
 * import { ModifyOperation } from './atomic-editor/operations/index.js';
 * import { SyntaxValidator } from './atomic-editor/validators/index.js';
 * ```
 * 
 * @module core/atomic-editor
 * @deprecated Use atomic-editor/index.js instead
 */

// Re-export everything from the new modular structure
export {
  // Main class and factories
  AtomicEditor,
  getAtomicEditor,
  resetAtomicEditor,
  createAtomicEditor,
  
  // Operations
  BaseOperation,
  InsertOperation,
  createInsertOperation,
  DeleteOperation,
  createDeleteOperation,
  ModifyOperation,
  createModifyOperation,
  
  // Validators
  SyntaxValidator,
  createSyntaxValidator,
  SafetyValidator,
  createSafetyValidator
} from './atomic-editor/index.js';

// Legacy default export for compatibility
import { AtomicEditor as AE, getAtomicEditor as gae } from './atomic-editor/index.js';
export default AE;

// Legacy singleton accessor
export const getLegacyAtomicEditor = gae;

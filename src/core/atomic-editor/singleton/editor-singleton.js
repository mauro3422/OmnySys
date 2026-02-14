/**
 * @fileoverview Editor Singleton - Gestión del singleton de AtomicEditor
 * 
 * Responsabilidad Única (SRP): Gestionar la instancia única de AtomicEditor.
 * 
 * @module atomic-editor/singleton
 */

// Singleton instance
let atomicEditor = null;

/**
 * Gets or creates the atomic editor singleton
 * @param {Function} factory - Factory function to create editor
 * @returns {Object} AtomicEditor instance
 */
export function getAtomicEditor(factory) {
  if (!atomicEditor) {
    atomicEditor = factory();
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
 * Checks if singleton exists
 * @returns {boolean}
 */
export function hasAtomicEditor() {
  return atomicEditor !== null;
}

/**
 * Gets current instance without creating
 * @returns {Object|null}
 */
export function getCurrentEditor() {
  return atomicEditor;
}

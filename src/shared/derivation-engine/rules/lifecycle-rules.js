/**
 * @fileoverview Lifecycle Derivation Rules
 * 
 * Reglas para derivar información de lifecycle desde átomos.
 * 
 * @module derivation-engine/rules/lifecycle-rules
 * @version 1.0.0
 */

/**
 * Lifecycle hooks = OR de átomos con hooks
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has lifecycle hooks
 */
export function moleculeHasLifecycleHooks(atoms) {
  return atoms.some(a => a.hasLifecycleHooks === true);
}

/**
 * Cleanup patterns = AND (todos tienen cleanup)
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - All have cleanup
 */
export function moleculeHasCleanupPatterns(atoms) {
  const hooksAtoms = atoms.filter(a => a.hasLifecycleHooks);
  if (hooksAtoms.length === 0) return false;
  return hooksAtoms.every(a => a.hasCleanupPatterns === true);
}

/**
 * Event listeners = OR lógico
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has event listeners
 */
export function moleculeHasEventListeners(atoms) {
  return atoms.some(a => a.hasEventListeners);
}

/**
 * Event emitters = OR lógico
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has event emitters
 */
export function moleculeHasEventEmitters(atoms) {
  return atoms.some(a => a.hasEventEmitters);
}

/**
 * Timers = OR lógico (setTimeout, setInterval)
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has timers
 */
export function moleculeHasTimers(atoms) {
  return atoms.some(a => a.hasTimers);
}

/**
 * Subscription patterns = OR lógico
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has subscriptions
 */
export function moleculeHasSubscriptions(atoms) {
  return atoms.some(a => a.hasSubscriptions);
}

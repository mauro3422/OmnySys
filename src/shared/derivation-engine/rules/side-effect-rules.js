/**
 * @fileoverview Side Effect Derivation Rules
 * 
 * Reglas para derivar información de side effects desde átomos.
 * 
 * @module derivation-engine/rules/side-effect-rules
 * @version 1.0.0
 */

/**
 * Network calls = OR lógico de átomos
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has network calls
 */
export function moleculeHasNetworkCalls(atoms) {
  return atoms.some(a => a.hasNetworkCalls);
}

/**
 * DOM manipulation = OR lógico de átomos
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has DOM manipulation
 */
export function moleculeHasDomManipulation(atoms) {
  return atoms.some(a => a.hasDomManipulation);
}

/**
 * Storage access = OR lógico de átomos
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has storage access
 */
export function moleculeHasStorageAccess(atoms) {
  return atoms.some(a => a.hasStorageAccess);
}

/**
 * Error handling = AND lógico (todos tienen error handling)
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - All have error handling
 */
export function moleculeHasErrorHandling(atoms) {
  if (atoms.length === 0) return false;
  return atoms.every(a => a.hasErrorHandling === true);
}

/**
 * Async patterns = OR lógico
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has async patterns
 */
export function moleculeHasAsyncPatterns(atoms) {
  return atoms.some(a => a.isAsync === true);
}

/**
 * Side effects = OR de átomos con side effects
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has side effects
 */
export function moleculeHasSideEffects(atoms) {
  return atoms.some(a =>
    a.hasSideEffects ||
    a.hasNetworkCalls ||
    a.hasDomManipulation ||
    a.hasStorageAccess ||
    a.hasLogging
  );
}

/**
 * External call count = suma de external calls de átomos
 * @param {Array} atoms - Functions in the file
 * @returns {number} - Total external calls
 */
export function moleculeExternalCallCount(atoms) {
  return atoms.reduce((sum, atom) =>
    sum + (atom.calls?.filter(c => c.type === 'external').length || 0), 0
  );
}

/**
 * Network endpoints = union de endpoints de átomos
 * @param {Array} atoms - Functions in the file
 * @returns {Array<string>} - Unique endpoints
 */
export function moleculeNetworkEndpoints(atoms) {
  const allEndpoints = atoms
    .flatMap(a => a.networkEndpoints || [])
    .filter(Boolean);
  return [...new Set(allEndpoints)];
}

/**
 * Logging presence = OR lógico
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has logging
 */
export function moleculeHasLogging(atoms) {
  return atoms.some(a => a.hasLogging);
}

/**
 * Database operations = OR lógico
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has database operations
 */
export function moleculeHasDatabaseOperations(atoms) {
  return atoms.some(a => a.hasDatabaseOperations);
}

/**
 * File system operations = OR lógico
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - Has file system operations
 */
export function moleculeHasFileSystemOperations(atoms) {
  return atoms.some(a => a.hasFileSystemOperations);
}

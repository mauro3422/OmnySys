/**
 * @fileoverview Export Derivation Rules
 * 
 * Reglas para derivar información de exports desde átomos.
 * 
 * @module derivation-engine/rules/export-rules
 * @version 1.0.0
 */

/**
 * Exports molecular = átomos exportados
 * @param {Array} atoms - Functions in the file
 * @returns {Array<string>} - Exported function names
 */
export function moleculeExports(atoms) {
  return atoms
    .filter(a => a.isExported)
    .map(a => a.name);
}

/**
 * Export count molecular = count de átomos exportados
 * @param {Array} atoms - Functions in the file
 * @returns {number} - Export count
 */
export function moleculeExportCount(atoms) {
  return atoms.filter(a => a.isExported).length;
}

/**
 * Function count molecular = count total de átomos
 * @param {Array} atoms - Functions in the file
 * @returns {number} - Function count
 */
export function moleculeFunctionCount(atoms) {
  return atoms.length;
}

/**
 * Obtiene información detallada de exports
 * @param {Array} atoms - Functions in the file
 * @returns {Array<Object>} - Export details
 */
export function moleculeExportDetails(atoms) {
  return atoms
    .filter(a => a.isExported)
    .map(a => ({
      name: a.name,
      id: a.id,
      type: a.type,
      complexity: a.complexity,
      hasSideEffects: !!(a.hasNetworkCalls || a.hasDomManipulation)
    }));
}

/**
 * Calcula el ratio de exports (exports / total functions)
 * @param {Array} atoms - Functions in the file
 * @returns {number} - Ratio (0-1)
 */
export function moleculeExportRatio(atoms) {
  if (atoms.length === 0) return 0;
  const exported = atoms.filter(a => a.isExported).length;
  return exported / atoms.length;
}

/**
 * Verifica si es un módulo de utilities (muchos exports pequeños)
 * @param {Array} atoms - Functions in the file
 * @returns {boolean} - True si es utility module
 */
export function isUtilityModule(atoms) {
  const exported = atoms.filter(a => a.isExported);
  if (exported.length < 3) return false;
  
  const avgComplexity = exported.reduce((sum, a) => sum + (a.complexity || 0), 0) / exported.length;
  return avgComplexity < 5;
}

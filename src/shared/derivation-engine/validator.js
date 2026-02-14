/**
 * @fileoverview Atom Validator
 * 
 * Valida que los átomos tengan la metadata requerida.
 * 
 * @module derivation-engine/validator
 * @version 1.0.0
 */

/**
 * Valida que los átomos tengan la metadata requerida
 * @param {Array} atoms - Functions to validate
 * @returns {Object} - Validation result
 */
export function validateAtoms(atoms) {
  const errors = [];
  const warnings = [];

  for (const atom of atoms) {
    // Required fields
    if (!atom.id) errors.push(`Atom missing id`);
    if (!atom.name) errors.push(`Atom ${atom.id} missing name`);
    if (atom.complexity === undefined) warnings.push(`Atom ${atom.id} missing complexity`);

    // Type consistency
    if (atom.type !== 'atom') {
      errors.push(`Atom ${atom.id} has wrong type: ${atom.type}`);
    }

    // Warnings
    if (!atom.filePath) warnings.push(`Atom ${atom.id} missing filePath`);
    if (atom.isExported === undefined) warnings.push(`Atom ${atom.id} missing isExported`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    atomCount: atoms.length
  };
}

/**
 * Valida una regla de derivación
 * @param {Function} rule - Regla a validar
 * @param {Array} testAtoms - Átomos de prueba
 * @returns {Object} - Resultado de validación
 */
export function validateRule(rule, testAtoms) {
  try {
    const result = rule(testAtoms);
    return {
      valid: true,
      result,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      result: null,
      error: error.message
    };
  }
}

/**
 * Valida todas las reglas con átomos de prueba
 * @param {Object} rules - Objeto con reglas
 * @param {Array} testAtoms - Átomos de prueba
 * @returns {Object} - Resultados por regla
 */
export function validateAllRules(rules, testAtoms) {
  const results = {};
  
  for (const [name, rule] of Object.entries(rules)) {
    if (typeof rule === 'function') {
      results[name] = validateRule(rule, testAtoms);
    }
  }
  
  return results;
}

export default validateAtoms;

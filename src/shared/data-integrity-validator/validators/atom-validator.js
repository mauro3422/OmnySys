/**
 * @fileoverview Atom Validator
 * 
 * Validates atom structure and required fields.
 * Ensures atoms conform to the expected schema.
 * 
 * @module data-integrity-validator/validators/atom-validator
 */

/**
 * Validates atom structure
 * 
 * @class AtomValidator
 */
export class AtomValidator {
  /**
   * Validates an atom
   * 
   * @param {string} atomId - Atom identifier
   * @param {Object} atom - Atom object to validate
   * @param {Object} result - Validation result to update
   * @param {Map} molecules - Available molecules for reference validation
   */
  validate(atomId, atom, result, molecules) {
    this._validateRequiredFields(atomId, atom, result);
    this._validateType(atomId, atom, result);
    this._validateArrays(atomId, atom, result);
    this._validateArchetype(atomId, atom, result);
    this._validateParentMolecule(atomId, atom, result, molecules);
  }

  /**
   * Validates required fields
   * @private
   */
  _validateRequiredFields(atomId, atom, result) {
    if (!atom.id) {
      result.addError('Atom missing id', { atomId });
    }
    if (!atom.name) {
      result.addError('Atom missing name', { atomId });
    }
    if (typeof atom.complexity !== 'number') {
      result.addWarning('Atom missing complexity', { atomId });
    }
  }

  /**
   * Validates atom type
   * @private
   */
  _validateType(atomId, atom, result) {
    if (atom.type !== 'atom') {
      result.addError('Atom has incorrect type', { atomId, type: atom.type });
    }
  }

  /**
   * Validates array fields
   * @private
   */
  _validateArrays(atomId, atom, result) {
    if (atom.calls && !Array.isArray(atom.calls)) {
      result.addError('Atom calls is not an array', { atomId });
    }

    if (atom.calledBy && !Array.isArray(atom.calledBy)) {
      result.addError('Atom calledBy is not an array', { atomId });
    }
  }

  /**
   * Validates archetype structure
   * @private
   */
  _validateArchetype(atomId, atom, result) {
    if (!atom.archetype) return;

    if (!atom.archetype.type) {
      result.addWarning('Atom archetype missing type', { atomId });
    }
    if (typeof atom.archetype.severity !== 'number') {
      result.addWarning('Atom archetype missing severity', { atomId });
    }
  }

  /**
   * Validates parent molecule reference
   * @private
   */
  _validateParentMolecule(atomId, atom, result, molecules) {
    if (!atom.parentMolecule) {
      result.addWarning('Atom missing parentMolecule', { atomId });
    } else if (!molecules.has(atom.parentMolecule)) {
      result.addError('Atom references non-existent molecule', {
        atomId,
        parentMolecule: atom.parentMolecule
      });
    }
  }
}

export default AtomValidator;

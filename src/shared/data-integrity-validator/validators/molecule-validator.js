/**
 * @fileoverview Molecule Validator
 * 
 * Validates molecule structure and atom references.
 * Ensures molecules are consistent with their atoms.
 * 
 * @module data-integrity-validator/validators/molecule-validator
 */

/**
 * Validates molecule structure
 * 
 * @class MoleculeValidator
 */
export class MoleculeValidator {
  /**
   * Validates a molecule
   * 
   * @param {string} moleculeId - Molecule identifier
   * @param {Object} molecule - Molecule object to validate
   * @param {Object} result - Validation result to update
   * @param {Map} atoms - Available atoms for reference validation
   */
  validate(moleculeId, molecule, result, atoms) {
    this._validateRequiredFields(moleculeId, molecule, result);
    this._validateType(moleculeId, molecule, result);
    this._validateAtoms(moleculeId, molecule, result, atoms);
  }

  /**
   * Validates required fields
   * @private
   */
  _validateRequiredFields(moleculeId, molecule, result) {
    if (!molecule.id) {
      result.addError('Molecule missing id', { moleculeId });
    }
  }

  /**
   * Validates molecule type
   * @private
   */
  _validateType(moleculeId, molecule, result) {
    if (molecule.type !== 'molecule') {
      result.addError('Molecule has incorrect type', { 
        moleculeId, 
        type: molecule.type 
      });
    }
  }

  /**
   * Validates atoms array and references
   * @private
   */
  _validateAtoms(moleculeId, molecule, result, atoms) {
    if (!molecule.atoms) {
      result.addWarning('Molecule missing atoms array', { moleculeId });
      return;
    }

    if (!Array.isArray(molecule.atoms)) {
      result.addError('Molecule atoms is not an array', { moleculeId });
      return;
    }

    // Check each atom reference
    for (const atomRef of molecule.atoms) {
      this._validateAtomReference(moleculeId, atomRef, result, atoms);
    }

    // Verify consistency between molecule and actual atoms
    this._verifyConsistency(moleculeId, molecule, result, atoms);
  }

  /**
   * Validates a single atom reference
   * @private
   */
  _validateAtomReference(moleculeId, atomRef, result, atoms) {
    const atomId = typeof atomRef === 'string' ? atomRef : atomRef.id;
    
    if (!atoms.has(atomId)) {
      result.addError('Molecule references non-existent atom', {
        moleculeId,
        atomId
      });
    }
  }

  /**
   * Verifies consistency between molecule and actual atoms
   * @private
   */
  _verifyConsistency(moleculeId, molecule, result, atoms) {
    const actualAtoms = Array.from(atoms.values())
      .filter(a => a.parentMolecule === moleculeId)
      .map(a => a.id);

    const referencedAtoms = molecule.atoms.map(ref =>
      typeof ref === 'string' ? ref : ref.id
    );

    const missingInMolecule = actualAtoms.filter(id => !referencedAtoms.includes(id));
    const extraInMolecule = referencedAtoms.filter(id => !actualAtoms.includes(id));

    if (missingInMolecule.length > 0) {
      result.addError('Atoms exist but not referenced in molecule', {
        moleculeId,
        missingAtoms: missingInMolecule
      });
    }

    if (extraInMolecule.length > 0) {
      result.addError('Molecule references non-existent atoms', {
        moleculeId,
        extraAtoms: extraInMolecule
      });
    }
  }
}

export default MoleculeValidator;

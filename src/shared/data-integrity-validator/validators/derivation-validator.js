/**
 * @fileoverview Derivation Validator
 * 
 * Validates that derived data matches source data.
 * Ensures computed values are consistent with their sources.
 * 
 * @module data-integrity-validator/validators/derivation-validator
 */

/**
 * Validates derived data consistency
 * 
 * @class DerivationValidator
 */
export class DerivationValidator {
  /**
   * Validates derived data for all molecules
   * 
   * @param {Map} molecules - All molecules to validate
   * @param {Map} atoms - All atoms for reference
   * @param {Object} result - Validation result to update
   */
  validate(molecules, atoms, result) {
    for (const [moleculeId, molecule] of molecules) {
      this._validateMoleculeDerivations(moleculeId, molecule, atoms, result);
    }
  }

  /**
   * Validates derivations for a single molecule
   * @private
   */
  _validateMoleculeDerivations(moleculeId, molecule, atoms, result) {
    if (!molecule.atoms || !Array.isArray(molecule.atoms)) return;

    const moleculeAtoms = this._getMoleculeAtoms(molecule, atoms);

    this._validateComplexity(moleculeId, molecule, moleculeAtoms, result);
    this._validateExportCount(moleculeId, molecule, moleculeAtoms, result);
    this._validateNetworkCalls(moleculeId, molecule, moleculeAtoms, result);
  }

  /**
   * Gets atoms belonging to a molecule
   * @private
   */
  _getMoleculeAtoms(molecule, atoms) {
    const atomIds = molecule.atoms.map(ref =>
      typeof ref === 'string' ? ref : ref.id
    );
    return atomIds.map(id => atoms.get(id)).filter(Boolean);
  }

  /**
   * Validates derived complexity
   * @private
   */
  _validateComplexity(moleculeId, molecule, moleculeAtoms, result) {
    if (molecule.totalComplexity === undefined) return;

    const expectedComplexity = moleculeAtoms
      .reduce((sum, a) => sum + (a.complexity || 0), 0);

    if (molecule.totalComplexity !== expectedComplexity) {
      result.addError('Derived complexity mismatch', {
        moleculeId,
        expected: expectedComplexity,
        actual: molecule.totalComplexity
      });
    }
  }

  /**
   * Validates derived export count
   * @private
   */
  _validateExportCount(moleculeId, molecule, moleculeAtoms, result) {
    if (molecule.exportCount === undefined) return;

    const expectedExports = moleculeAtoms.filter(a => a.isExported).length;

    if (molecule.exportCount !== expectedExports) {
      result.addError('Derived export count mismatch', {
        moleculeId,
        expected: expectedExports,
        actual: molecule.exportCount
      });
    }
  }

  /**
   * Validates derived network calls flag
   * @private
   */
  _validateNetworkCalls(moleculeId, molecule, moleculeAtoms, result) {
    if (molecule.hasNetworkCalls === undefined) return;

    const expectedNetwork = moleculeAtoms.some(a => a.hasNetworkCalls);

    if (molecule.hasNetworkCalls !== expectedNetwork) {
      result.addError('Derived hasNetworkCalls mismatch', {
        moleculeId,
        expected: expectedNetwork,
        actual: molecule.hasNetworkCalls
      });
    }
  }
}

export default DerivationValidator;

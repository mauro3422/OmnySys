/**
 * @fileoverview Orphan Checker
 * 
 * Detects orphaned data - atoms without molecules
 * and molecules without atoms.
 * 
 * @module data-integrity-validator/checks/orphan-checker
 */

/**
 * Checks for orphaned data
 * 
 * @class OrphanChecker
 */
export class OrphanChecker {
  /**
   * Checks for orphaned atoms and molecules
   * 
   * @param {Map} atoms - All atoms
   * @param {Map} molecules - All molecules
   * @param {Object} result - Validation result to update
   */
  check(atoms, molecules, result) {
    this._checkOrphanedAtoms(atoms, result);
    this._checkEmptyMolecules(molecules, result);
  }

  /**
   * Checks for atoms without parent molecules
   * @private
   */
  _checkOrphanedAtoms(atoms, result) {
    for (const [atomId, atom] of atoms) {
      if (!atom.parentMolecule) {
        result.addWarning('Orphaned atom (no parent molecule)', { atomId });
      }
    }
  }

  /**
   * Checks for molecules without atoms
   * @private
   */
  _checkEmptyMolecules(molecules, result) {
    for (const [moleculeId, molecule] of molecules) {
      if (!molecule.atoms || molecule.atoms.length === 0) {
        result.addWarning('Empty molecule (no atoms)', { moleculeId });
      }
    }
  }
}

export default OrphanChecker;

/**
 * @fileoverview Cross-Reference Validator
 * 
 * Validates cross-references between atoms (calledBy <-> calls).
 * Ensures bidirectional references are consistent.
 * 
 * @module data-integrity-validator/validators/cross-reference-validator
 */

/**
 * Validates cross-references between atoms
 * 
 * @class CrossReferenceValidator
 */
export class CrossReferenceValidator {
  /**
   * Validates cross-references between atoms
   * 
   * @param {Map} atoms - All atoms to validate
   * @param {Object} result - Validation result to update
   */
  validate(atoms, result) {
    let refsChecked = 0;

    for (const [atomId, atom] of atoms) {
      if (!atom.calls) continue;

      for (const call of atom.calls) {
        refsChecked++;
        this._validateCall(atomId, atom, call, atoms, result);
      }
    }

    result.stats.referencesChecked = refsChecked;
  }

  /**
   * Validates a single call reference
   * @private
   */
  _validateCall(atomId, atom, call, atoms, result) {
    const targetName = typeof call === 'string' ? call : call.name;

    // Find target atom
    const targetAtom = Array.from(atoms.values())
      .find(a => a.name === targetName);

    if (!targetAtom) return;

    // Verify bidirectional reference
    const hasBackRef = this._hasBackReference(targetAtom, atom);

    if (!hasBackRef) {
      result.addWarning('Missing back-reference (calledBy)', {
        from: atomId,
        to: targetAtom.id,
        call: targetName
      });
    }
  }

  /**
   * Checks if target has back-reference to source
   * @private
   */
  _hasBackReference(targetAtom, sourceAtom) {
    if (!targetAtom.calledBy) return false;

    return targetAtom.calledBy.some(ref => {
      const refName = typeof ref === 'string' ? ref : ref.name;
      return refName === sourceAtom.name || refName === sourceAtom.id;
    });
  }
}

export default CrossReferenceValidator;

/**
 * @fileoverview module-state-tracker.js
 *
 * Tracks modifications to module-level state
 *
 * @module race-detector/trackers/module-state-tracker
 */

import { BaseTracker } from './base-tracker.js';

/**
 * Tracker for module state access
 */
export class ModuleStateTracker extends BaseTracker {
  /**
   * Track module state modifications
   * @param {Object} molecule - Molecule with atoms
   * @param {Object} module - Parent module
   */
  trackMolecule(molecule, module) {
    const atoms = molecule.atoms || [];
    
    for (const atom of atoms) {
      this.trackAtom(atom, molecule, module);
    }
  }

  /**
   * Track module state in a single atom
   * @private
   */
  trackAtom(atom, molecule, module) {
    const sideEffects = atom.dataFlow?.sideEffects || [];
    
    for (const effect of sideEffects) {
      if (this.isModuleStateWrite(effect)) {
        this.registerAccess(
          'module',
          effect.target || effect.variable || 'unknown',
          atom,
          module,
          effect,
          molecule.filePath
        );
      }
    }
  }

  /**
   * Check if effect is a module state write
   * @private
   */
  isModuleStateWrite(effect) {
    // Check for explicit module state writes
    if (effect.type === 'module_state_write') {
      return true;
    }
    
    // Check for writes to module-level variables
    if (effect.target?.includes('module.')) {
      return true;
    }
    
    // Check for modifications to exported variables
    if (effect.type === 'write' && !effect.variable?.includes('.')) {
      // Simple variable write at module level
      return true;
    }
    
    return false;
  }
}

export default ModuleStateTracker;

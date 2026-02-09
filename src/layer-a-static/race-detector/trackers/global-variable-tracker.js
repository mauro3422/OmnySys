/**
 * @fileoverview global-variable-tracker.js
 *
 * Tracks access to global variables (window, global, globalThis, process.env)
 *
 * @module race-detector/trackers/global-variable-tracker
 */

import { BaseTracker } from './base-tracker.js';

/**
 * Tracker for global variable access
 */
export class GlobalVariableTracker extends BaseTracker {
  /**
   * Track global variable access in a molecule
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
   * Track global access in a single atom
   * @private
   */
  trackAtom(atom, molecule, module) {
    // Check dataFlow side effects for global access
    const sideEffects = atom.dataFlow?.sideEffects || [];
    
    for (const effect of sideEffects) {
      if (this.isGlobalAccess(effect)) {
        this.registerAccess(
          'global',
          effect.variable || effect.target,
          atom,
          module,
          effect,
          molecule.filePath
        );
      }
    }
    
    // Also check code directly for simple global writes
    if (atom.code) {
      const globalWrites = this.findGlobalWrites(atom.code);
      for (const write of globalWrites) {
        this.registerAccess(
          'global',
          write.variable,
          atom,
          module,
          { type: 'write', line: write.line },
          molecule.filePath
        );
      }
    }
  }

  /**
   * Check if effect is a global variable access
   * @private
   */
  isGlobalAccess(effect) {
    const globalIndicators = ['global.', 'window.', 'globalThis.', 'process.env'];
    return globalIndicators.some(ind => 
      (effect.variable && effect.variable.includes(ind)) ||
      (effect.target && effect.target.includes(ind))
    );
  }

  /**
   * Find global variable writes in code
   * @private
   */
  findGlobalWrites(code) {
    const writes = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const patterns = [
        { regex: /global\.(\w+)\s*=/, prefix: 'global' },
        { regex: /window\.(\w+)\s*=/, prefix: 'window' },
        { regex: /globalThis\.(\w+)\s*=/, prefix: 'globalThis' }
      ];
      
      for (const { regex, prefix } of patterns) {
        const match = line.match(regex);
        if (match) {
          writes.push({ 
            variable: `${prefix}.${match[1]}`, 
            line: i + 1 
          });
        }
      }
    }
    
    return writes;
  }
}

export default GlobalVariableTracker;

/**
 * @fileoverview module-state-tracker.js
 *
 * Tracks modifications to module-level state
 * 
 * UPDATED: Now uses Tree-sitter metadata from atom.sharedStateAccess
 * for accurate scope detection (local vs module vs global)
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
    if (!molecule) return;
    const atoms = molecule.atoms || [];

    for (const atom of atoms) {
      this.trackAtom(atom, molecule, module);
    }
  }

  /**
   * Track module state in a single atom
   * Uses Tree-sitter metadata for accurate scope detection
   * @private
   */
  trackAtom(atom, molecule, module) {
    // PRIORITY 1: Use Tree-sitter metadata if available (most accurate)
    if (atom.sharedStateAccess && atom.sharedStateAccess.length > 0) {
      for (const access of atom.sharedStateAccess) {
        // Tree-sitter already determined the scope
        const stateType = access.scopeType || this.determineStateTypeFromAccess(access, atom);
        
        this.registerAccess(
          stateType,
          access.fullReference || access.variable || 'unknown',
          atom,
          module,
          {
            type: access.type === 'write' ? 'write' : 'read',
            line: access.line,
            source: 'tree-sitter'
          },
          molecule.filePath
        );
      }
      return; // Don't process sideEffects if we have Tree-sitter data
    }

    // FALLBACK: Use sideEffects from dataFlow (less accurate)
    const sideEffects = atom.dataFlow?.sideEffects || [];

    for (const effect of sideEffects) {
      if (this.isModuleStateWrite(effect)) {
        const stateType = this.determineStateType(effect, atom);
        
        this.registerAccess(
          stateType,
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
   * Determine state type from Tree-sitter access
   * @private
   */
  determineStateTypeFromAccess(access, atom) {
    // Tree-sitter provides functionContext
    if (access.functionContext === 'module-level') {
      return 'module';
    }
    
    // Check if it's a global (window.*, global.*, globalThis.*)
    if (access.objectName && ['window', 'global', 'globalThis'].includes(access.objectName)) {
      return 'global';
    }
    
    // For other cases, check if variable is local
    return this.determineStateType({ target: access.fullReference }, atom);
  }

  /**
   * Check if effect is a module state write
   * @private
   */
  isModuleStateWrite(effect) {
    if (!effect) return false;
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

/**
 * @fileoverview base-tracker.js
 *
 * Base class for all state trackers in the race detection system.
 * Follows Template Method pattern for consistent state tracking.
 *
 * ARCHITECTURE: Layer B (Pattern Detection)
 * Trackers analyze atomic metadata to identify shared state
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📋 EXTENSION GUIDE - Creating New State Trackers
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * To track a new type of shared state:
 *
 * 1️⃣  EXTEND BaseTracker
 * 
 *     import { BaseTracker } from './base-tracker.js';
 *     
 *     export class YourStateTracker extends BaseTracker {
 *       constructor(project) {
 *         super(project);
 *       }
 *       
 *       trackMolecule(molecule, module) {
 *         // Your tracking logic here
 *         for (const atom of molecule.atoms || []) {
 *           if (this.hasYourStatePattern(atom)) {
 *             this.registerAccess(
 *               'your-type',
 *               stateKey,
 *               atom,
 *               module,
 *               { type: 'access', line: atom.line },
 *               molecule.filePath
 *             );
 *           }
 *         }
 *       }
 *     }
 *
 * 2️⃣  ADD TO PIPELINE in race-detector/index.js
 *     this.trackers.push(new YourStateTracker(projectData));
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @module race-detector/trackers/base-tracker
 */

/**
 * Abstract base class for state trackers
 * @abstract
 */
export class BaseTracker {
  /**
   * Creates a new state tracker
   * @param {Object} project - Project data with modules/molecules/atoms
   */
  constructor(project) {
    this.project = project;
    this.state = new Map(); // stateKey -> accessPoints[]
  }

  /**
   * Main entry point - executes the tracking algorithm
   * Template method pattern - don't override this, override trackMolecule()
   * 
   * @returns {Map<string, Array>} - Map of stateKey to access points
   * @example
   * const tracker = new GlobalVariableTracker(project);
   * const state = tracker.track();
   * // state.get('global:window.user') -> [{ atom, file, type, ... }]
   */
  track() {
    this.initialize();
    
    for (const module of this.project.modules || []) {
      for (const molecule of module.files || []) {
        this.trackMolecule(molecule, module);
      }
    }
    
    return this.finalize();
  }

  /**
   * Initialize tracking state
   * Override in subclasses if you need custom initialization
   * 
   * @protected
   */
  initialize() {
    this.state.clear();
  }

  /**
   * Track a single molecule (file)
   * IMPLEMENT THIS METHOD in subclasses
   * 
   * @abstract
   * @param {Object} molecule - Molecule data with atoms
   * @param {Object} module - Parent module
   * @example
   * trackMolecule(molecule, module) {
   *   for (const atom of molecule.atoms || []) {
   *     if (atom.hasGlobalAccess) {
   *       this.registerAccess('global', atom.globalVar, atom, module, 
   *         { type: 'read' }, molecule.filePath);
   *     }
   *   }
   * }
   */
  trackMolecule(molecule, module) {
    throw new Error('Subclasses must implement trackMolecule()');
  }

  /**
   * Finalize and return tracked state
   * Override for custom post-processing
   * 
   * @protected
   * @returns {Map} - Tracked state
   */
  finalize() {
    return this.state;
  }

  /**
   * Register a state access point
   * Use this method to record state accesses found during tracking
   * 
   * @protected
   * @param {string} stateType - Type of state (global, module, external, etc.)
   * @param {string} stateKey - Unique key for this state
   * @param {Object} atom - Atom that accessed the state
   * @param {Object} module - Module containing the atom
   * @param {Object} accessInfo - Details of the access
   * @param {string} [accessInfo.type] - Type of access (read/write/call/etc.)
   * @param {number} [accessInfo.line] - Line number
   * @param {string} [accessInfo.operation] - Operation performed
   * @param {string} filePath - Path to the file
   * 
   * @example
   * this.registerAccess(
   *   'global',                    // stateType
   *   'window.currentUser',        // stateKey
   *   atom,                        // atom
   *   module,                      // module
   *   { type: 'write', line: 42 }, // accessInfo
   *   'src/auth.js'                // filePath
   * );
   */
  registerAccess(stateType, stateKey, atom, module, accessInfo, filePath) {
    const fullKey = `${stateType}:${stateKey}`;
    
    if (!this.state.has(fullKey)) {
      this.state.set(fullKey, []);
    }
    
    this.state.get(fullKey).push({
      atom: atom.id,
      atomName: atom.name,
      file: filePath || module?.modulePath || 'unknown',
      module: module?.moduleName || 'unknown',
      type: accessInfo.type || 'unknown',
      isAsync: atom.isAsync || false,
      isExported: atom.isExported || false,
      line: accessInfo.line || 0,
      operation: accessInfo.operation,
      timestamp: Date.now()
    });
  }
}

export default BaseTracker;

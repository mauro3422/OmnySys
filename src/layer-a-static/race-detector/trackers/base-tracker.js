/**
 * @fileoverview base-tracker.js
 *
 * Base class for all state trackers in the race detection system.
 * Follows Template Method pattern for consistent state tracking.
 *
 * ARCHITECTURE: Layer B (Pattern Detection)
 * Trackers analyze atomic metadata to identify shared state
 *
 * @module race-detector/trackers/base-tracker
 */

/**
 * Abstract base class for state trackers
 * @abstract
 */
export class BaseTracker {
  /**
   * @param {Object} project - Project data with modules/molecules/atoms
   */
  constructor(project) {
    this.project = project;
    this.state = new Map(); // stateKey -> accessPoints[]
  }

  /**
   * Main entry point - executes the tracking algorithm
   * Template method pattern
   * @returns {Map} - Map of stateKey to access points
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
   * Override in subclasses if needed
   */
  initialize() {
    this.state.clear();
  }

  /**
   * Track a single molecule (file)
   * @abstract
   * @param {Object} molecule - Molecule data with atoms
   * @param {Object} module - Parent module
   */
  trackMolecule(molecule, module) {
    throw new Error('Must implement trackMolecule()');
  }

  /**
   * Finalize and return tracked state
   * @returns {Map} - Tracked state
   */
  finalize() {
    return this.state;
  }

  /**
   * Register a state access point
   * @protected
   * @param {string} stateType - Type of state (global, module, etc.)
   * @param {string} stateKey - Unique key for this state
   * @param {Object} atom - Atom that accessed the state
   * @param {Object} module - Module containing the atom
   * @param {Object} accessInfo - Details of the access
   * @param {string} filePath - Path to the file
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

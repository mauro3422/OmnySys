/**
 * @fileoverview Modification Tracker
 * 
 * Tracks which atoms have been modified recently.
 * Provides cleanup and statistics functionality.
 * 
 * @module tunnel-vision-detector/analyzers/modification-tracker
 */

/**
 * Default recent window in milliseconds (5 minutes)
 * @const {number}
 */
const DEFAULT_WINDOW_MS = 5 * 60 * 1000;

/**
 * Tracks atom modifications
 * 
 * @class ModificationTracker
 */
export class ModificationTracker {
  /**
   * Creates a modification tracker
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.windowMs=300000] - Recent window in milliseconds
   */
  constructor(options = {}) {
    this.modifications = new Map();
    this.windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  }

  /**
   * Marks an atom as modified
   * 
   * @param {string} atomId - Atom identifier
   * @returns {number} Timestamp of modification
   */
  mark(atomId) {
    const timestamp = Date.now();
    this.modifications.set(atomId, timestamp);
    return timestamp;
  }

  /**
   * Checks if an atom was recently modified
   * 
   * @param {string} atomId - Atom identifier
   * @returns {boolean}
   */
  wasRecentlyModified(atomId) {
    const timestamp = this.modifications.get(atomId);
    if (!timestamp) return false;

    const now = Date.now();
    const age = now - timestamp;

    if (age > this.windowMs) {
      this.modifications.delete(atomId);
      return false;
    }

    return true;
  }

  /**
   * Cleans up old modifications
   */
  cleanup() {
    const now = Date.now();
    for (const [atomId, timestamp] of this.modifications.entries()) {
      if (now - timestamp > this.windowMs) {
        this.modifications.delete(atomId);
      }
    }
  }

  /**
   * Gets modification history
   * 
   * @returns {Array<Object>} List of modifications with age
   */
  getHistory() {
    return Array.from(this.modifications.entries()).map(([atomId, timestamp]) => ({
      atomId,
      timestamp,
      age: Date.now() - timestamp
    }));
  }

  /**
   * Gets statistics
   * 
   * @returns {Object}
   */
  getStats() {
    return {
      recentlyModifiedCount: this.modifications.size,
      windowMs: this.windowMs
    };
  }

  /**
   * Clears all tracked modifications
   */
  clear() {
    this.modifications.clear();
  }

  /**
   * Checks if an atom is tracked
   * 
   * @param {string} atomId - Atom identifier
   * @returns {boolean}
   */
  has(atomId) {
    return this.modifications.has(atomId);
  }

  /**
   * Gets the number of tracked modifications
   * @returns {number}
   */
  size() {
    return this.modifications.size;
  }
}

export default ModificationTracker;

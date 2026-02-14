/**
 * @fileoverview Atomic Tunnel Vision Detector
 * 
 * Detects tunnel vision at the atom (function) level.
 * Tracks modified atoms and their callers.
 * 
 * @module tunnel-vision-detector/detectors/atomic-detector
 */

import { getAtomDetails } from '../../layer-a-static/query/apis/file-api.js';

/**
 * Detects tunnel vision for individual atoms
 * 
 * @class AtomicDetector
 */
export class AtomicDetector {
  /**
   * Creates an atomic detector
   * @param {Object} options - Configuration options
   * @param {Function} options.wasRecentlyModified - Function to check modification history
   * @param {Function} options.markAsModified - Function to mark atom as modified
   * @param {number} options.minUnmodifiedDependents - Minimum unmodified callers to trigger alert
   */
  constructor(options) {
    this.wasRecentlyModified = options.wasRecentlyModified;
    this.markAsModified = options.markAsModified;
    this.minUnmodifiedDependents = options.minUnmodifiedDependents;
  }

  /**
   * Detects tunnel vision for a specific atom
   * 
   * @param {string} projectPath - Project path
   * @param {string} filePath - File path
   * @param {string} functionName - Function name
   * @returns {Promise<Object|null>} Alert data or null
   */
  async detect(projectPath, filePath, functionName) {
    const atomId = `${filePath}::${functionName}`;
    this.markAsModified(atomId);

    const atom = await this._getAtomWithCallers(projectPath, filePath, functionName);
    if (!atom) return null;

    const unmodifiedCallers = this._getUnmodifiedCallers(atom);

    if (unmodifiedCallers.length < this.minUnmodifiedDependents) {
      return null;
    }

    return this._createAlert({
      atomId,
      filePath,
      functionName,
      atom,
      unmodifiedCallers
    });
  }

  /**
   * Gets atom with its callers
   * @private
   */
  async _getAtomWithCallers(projectPath, filePath, functionName) {
    const atom = await getAtomDetails(projectPath, filePath, functionName);
    if (!atom) return null;

    return {
      ...atom,
      callers: atom.calledBy || []
    };
  }

  /**
   * Gets unmodified callers
   * @private
   */
  _getUnmodifiedCallers(atom) {
    return atom.callers.filter(callerId => !this.wasRecentlyModified(callerId));
  }

  /**
   * Creates alert data
   * @private
   */
  _createAlert({ atomId, filePath, functionName, atom, unmodifiedCallers }) {
    return {
      type: 'ATOMIC',
      modifiedAtom: atomId,
      filePath,
      functionName,
      atom,
      unmodifiedCallers,
      totalCallers: atom.callers.length
    };
  }
}

export default AtomicDetector;

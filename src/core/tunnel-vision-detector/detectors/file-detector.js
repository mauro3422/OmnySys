/**
 * @fileoverview File Tunnel Vision Detector
 * 
 * Detects tunnel vision for all functions in a file.
 * Analyzes all exported atoms in the file.
 * 
 * @module tunnel-vision-detector/detectors/file-detector
 */

import { getFileAnalysisWithAtoms } from '../../../layer-c-memory/query/apis/file-api.js';

/**
 * Detects tunnel vision at file level
 * 
 * @class FileDetector
 */
export class FileDetector {
  /**
   * Creates a file detector
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
   * Detects tunnel vision for all atoms in a file
   * 
   * @param {string} projectPath - Project path
   * @param {string} filePath - File path
   * @param {Function} severityCalculator - Severity calculation function
   * @returns {Promise<Object|null>} Aggregated alert or null
   */
  async detect(projectPath, filePath, severityCalculator) {
    const fileData = await getFileAnalysisWithAtoms(projectPath, filePath);
    if (!fileData?.atoms?.length) return null;

    const alerts = this._collectAlerts(fileData.atoms, severityCalculator);
    
    if (alerts.length === 0) return null;

    return this._createAggregatedAlert(filePath, alerts);
  }

  /**
   * Collects alerts for all modified atoms
   * @private
   */
  _collectAlerts(atoms, severityCalculator) {
    const alerts = [];

    for (const atom of atoms) {
      if (!atom.isExported || !atom.calledBy?.length) continue;

      this.markAsModified(atom.id);

      const unmodifiedCallers = atom.calledBy
        .filter(callerId => !this.wasRecentlyModified(callerId));

      if (unmodifiedCallers.length >= this.minUnmodifiedDependents) {
        alerts.push({
          atom: atom.name,
          atomId: atom.id,
          unmodifiedCallers,
          severity: severityCalculator(atom, unmodifiedCallers.length)
        });
      }
    }

    return alerts;
  }

  /**
   * Creates aggregated alert
   * @private
   */
  _createAggregatedAlert(filePath, alerts) {
    const allUnmodifiedCallers = [...new Set(
      alerts.flatMap(a => a.unmodifiedCallers)
    )];

    return {
      filePath,
      atomsModified: alerts.map(a => a.atom),
      totalAtomsModified: alerts.length,
      unmodifiedCallers: allUnmodifiedCallers,
      details: alerts.slice(0, 5) // Top 5 most critical
    };
  }
}

export default FileDetector;

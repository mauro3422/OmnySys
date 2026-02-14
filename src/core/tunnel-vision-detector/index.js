/**
 * @fileoverview Tunnel Vision Detector - Modular Architecture
 * 
 * Detects tunnel vision anti-patterns when modifying code.
 * Alerts when you modify a function but not its dependents.
 * 
 * CORE IDEA (Molecular): If you modify atom A that is called by B, C, D
 *                        and you DON'T modify B, C, D → TUNNEL VISION ALERT
 * 
 * @module tunnel-vision-detector
 * @version 3.0.0
 */

import { AtomicDetector } from './detectors/atomic-detector.js';
import { FileDetector } from './detectors/file-detector.js';
import { SeverityAnalyzer } from './analyzers/severity-analyzer.js';
import { ModificationTracker } from './analyzers/modification-tracker.js';
import { AlertBuilder } from './reports/alert-builder.js';
import { AlertFormatter } from './reports/alert-formatter.js';

/**
 * Minimum unmodified dependents threshold to trigger alert
 * @const {number}
 */
const MIN_UNMODIFIED_DEPENDENTS = 2;

/**
 * Recent modification window in milliseconds (5 minutes)
 * @const {number}
 */
const RECENT_WINDOW_MS = 5 * 60 * 1000;

/**
 * Detects tunnel vision anti-patterns
 * 
 * @class TunnelVisionDetector
 */
export class TunnelVisionDetector {
  constructor() {
    this.tracker = new ModificationTracker({ windowMs: RECENT_WINDOW_MS });
    this.severityAnalyzer = new SeverityAnalyzer();
    this.alertBuilder = new AlertBuilder();
    this.alertFormatter = new AlertFormatter();

    // Initialize detectors
    const detectorOptions = {
      wasRecentlyModified: (id) => this.tracker.wasRecentlyModified(id),
      markAsModified: (id) => this.tracker.mark(id),
      minUnmodifiedDependents: MIN_UNMODIFIED_DEPENDENTS
    };

    this.detectors = {
      atomic: new AtomicDetector(detectorOptions),
      file: new FileDetector(detectorOptions)
    };

    // Start periodic cleanup
    this._startCleanup();
  }

  /**
   * Detects tunnel vision for a specific function or file
   * 
   * @param {string} projectPath - Project path
   * @param {string} filePath - File path
   * @param {string} [functionName=null] - Specific function (optional)
   * @returns {Promise<Object|null>} Alert or null
   */
  async detect(projectPath, filePath, functionName = null) {
    // If no function specified, analyze entire file
    if (!functionName) {
      const alertData = await this.detectors.file.detect(
        projectPath,
        filePath,
        (atom, count) => this.severityAnalyzer.calculate(atom, count)
      );
      
      return alertData ? this.alertBuilder.buildFileAlert(alertData) : null;
    }

    // Atomic detection for specific function
    const alertData = await this.detectors.atomic.detect(
      projectPath,
      filePath,
      functionName
    );

    return alertData ? this.alertBuilder.buildAtomicAlert(alertData) : null;
  }

  /**
   * Formats alert for display
   * 
   * @param {Object} alert - Alert to format
   * @returns {string} Formatted string
   */
  format(alert) {
    return this.alertFormatter.format(alert);
  }

  /**
   * Gets current statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.tracker.getStats(),
      minThreshold: MIN_UNMODIFIED_DEPENDENTS,
      version: '3.0',
      architecture: 'molecular'
    };
  }

  /**
   * Gets modification history
   * @returns {Array}
   */
  getModificationHistory() {
    return this.tracker.getHistory();
  }

  /**
   * Manually triggers cleanup
   */
  cleanup() {
    this.tracker.cleanup();
  }

  /**
   * Starts periodic cleanup
   * @private
   */
  _startCleanup() {
    setInterval(() => this.cleanup(), 60 * 1000);
  }
}

// Create singleton instance for simple usage
const detector = new TunnelVisionDetector();

/**
 * Detects tunnel vision (convenience function)
 * 
 * @param {string} projectPath - Project path
 * @param {string} filePath - File path
 * @param {string} [functionName=null] - Specific function
 * @returns {Promise<Object|null>}
 */
export function detectTunnelVision(projectPath, filePath, functionName = null) {
  return detector.detect(projectPath, filePath, functionName);
}

/**
 * Formats alert for display (convenience function)
 * 
 * @param {Object} alert - Alert to format
 * @returns {string}
 */
export function formatAlert(alert) {
  return detector.format(alert);
}

/**
 * Gets statistics (convenience function)
 * @returns {Object}
 */
export function getStats() {
  return detector.getStats();
}

/**
 * Gets modification history (convenience function)
 * @returns {Array}
 */
export function getModificationHistory() {
  return detector.getModificationHistory();
}

/**
 * Cleans up old modifications (convenience function)
 */
export function cleanupHistory() {
  return detector.cleanup();
}

// Export all components for advanced usage
export {
  AtomicDetector,
  FileDetector,
  SeverityAnalyzer,
  ModificationTracker,
  AlertBuilder,
  AlertFormatter
};

export default TunnelVisionDetector;

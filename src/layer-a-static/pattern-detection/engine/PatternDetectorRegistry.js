/**
 * @fileoverview PatternDetectorRegistry.js
 * 
 * Registry for pattern detectors.
 * 
 * @module pattern-detection/engine/PatternDetectorRegistry
 */

/**
 * Registry for pattern detectors
 */
export class PatternDetectorRegistry {
  constructor() {
    this.detectors = new Map();
  }

  /**
   * Register a detector
   */
  register(config) {
    const { id, priority = 50 } = config;
    this.detectors.set(id, { ...config, priority });
  }

  /**
   * Get all detectors sorted by priority
   */
  getAll() {
    return Array.from(this.detectors.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get detector by ID
   */
  get(id) {
    return this.detectors.get(id);
  }

  /**
   * Unregister a detector
   */
  unregister(id) {
    this.detectors.delete(id);
  }

  /**
   * Clear all detectors
   */
  clear() {
    this.detectors.clear();
  }
}

export default PatternDetectorRegistry;

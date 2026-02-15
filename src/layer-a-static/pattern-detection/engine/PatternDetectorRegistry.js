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
    const { id, priority = 0 } = config;
    if (!id) {
      throw new Error('Detector id is required');
    }
    if (this.detectors.has(id)) {
      throw new Error(`Detector ${id} already registered`);
    }
    this.detectors.set(id, { 
      ...config, 
      priority,
      registeredAt: new Date().toISOString()
    });
  }

  /**
   * Get all detectors sorted by priority
   */
  getAll() {
    return Array.from(this.detectors.values())
      .sort((a, b) => {
        // Sort by priority descending, then by id ascending for stable ordering
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.id.localeCompare(b.id);
      });
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
    return this.detectors.delete(id);
  }

  /**
   * Clear all detectors
   */
  clear() {
    this.detectors.clear();
  }

  /**
   * Check if a detector exists
   */
  has(id) {
    return this.detectors.has(id);
  }

  /**
   * Get count of registered detectors
   */
  size() {
    return this.detectors.size;
  }
}

export default PatternDetectorRegistry;

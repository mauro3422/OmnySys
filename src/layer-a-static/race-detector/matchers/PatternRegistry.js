/**
 * @fileoverview PatternRegistry.js
 * 
 * Registry for race pattern definitions.
 * 
 * @module race-detector/matchers/PatternRegistry
 */

import { PatternDetectors } from '../patterns/index.js';

/**
 * Registry for pattern definitions
 */
export class PatternRegistry {
  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }

  /**
   * Initialize all pattern definitions
   * @private
   */
  initializePatterns() {
    // Singleton initialization pattern
    this.patterns.set('singleton', {
      name: 'Singleton Initialization',
      detect: (race) => PatternDetectors.isSingletonPattern(race)
    });

    // Counter increment pattern
    this.patterns.set('counter', {
      name: 'Counter Increment',
      detect: (race) => PatternDetectors.isCounterPattern(race)
    });

    // Array modification pattern
    this.patterns.set('array', {
      name: 'Array Modification',
      detect: (race) => PatternDetectors.isArrayPattern(race)
    });

    // Cache population pattern
    this.patterns.set('cache', {
      name: 'Cache Population',
      detect: (race) => PatternDetectors.isCachePattern(race)
    });

    // Lazy initialization pattern
    this.patterns.set('lazy_init', {
      name: 'Lazy Initialization',
      detect: (race) => PatternDetectors.isLazyInitPattern(race)
    });

    // Event subscription pattern
    this.patterns.set('event_sub', {
      name: 'Event Subscription',
      detect: (race) => PatternDetectors.isEventPattern(race)
    });

    // Database update pattern
    this.patterns.set('db_update', {
      name: 'Database Update',
      detect: (race) => PatternDetectors.isDbUpdatePattern(race)
    });

    // File write pattern
    this.patterns.set('file_write', {
      name: 'File Write',
      detect: (race) => PatternDetectors.isFileWritePattern(race)
    });
  }

  /**
   * Get all patterns
   * @returns {Map} - All patterns
   */
  getAllPatterns() {
    return this.patterns;
  }

  /**
   * Get pattern list as array
   * @returns {Array} - Pattern metadata
   */
  getPatternList() {
    return Array.from(this.patterns.entries()).map(([key, pattern]) => ({
      key,
      name: pattern.name
    }));
  }

  /**
   * Register a new pattern
   * @param {string} key - Pattern key
   * @param {string} name - Pattern name
   * @param {Function} detectFn - Detection function
   */
  register(key, name, detectFn) {
    this.patterns.set(key, { name, detect: detectFn });
  }
}

export default PatternRegistry;

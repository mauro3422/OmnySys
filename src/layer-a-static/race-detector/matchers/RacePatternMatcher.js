/**
 * @fileoverview RacePatternMatcher.js
 * 
 * Main class for detecting specific race condition patterns.
 * 
 * @module race-detector/matchers/RacePatternMatcher
 */

import { PatternRegistry } from './PatternRegistry.js';

/**
 * Detects specific race condition patterns
 */
export class RacePatternMatcher {
  constructor() {
    this.registry = new PatternRegistry();
    this.patterns = this.registry.getAllPatterns();
  }

  /**
   * Detect all patterns in a race
   * @param {Object} race - Race condition object
   * @returns {Array} - Detected patterns
   */
  detectPatterns(race) {
    const detected = [];

    for (const [key, pattern] of this.patterns) {
      if (pattern.detect(race)) {
        detected.push({
          key,
          name: pattern.name,
          race: race.id
        });
      }
    }

    return detected;
  }

  /**
   * Get all available patterns
   * @returns {Array} - Pattern metadata
   */
  getPatterns() {
    return this.registry.getPatternList();
  }

  /**
   * Add a custom pattern
   * @param {string} key - Pattern key
   * @param {string} name - Pattern name
   * @param {Function} detectFn - Detection function
   */
  addPattern(key, name, detectFn) {
    this.registry.register(key, name, detectFn);
    this.patterns = this.registry.getAllPatterns();
  }
}

export default RacePatternMatcher;

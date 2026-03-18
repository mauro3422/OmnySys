/**
 * @fileoverview RacePatternMatcher.js
 * 
 * Main class for detecting specific race condition patterns.
 * 
 * @module race-detector/matchers/RacePatternMatcher
 */

import { PatternRegistry } from '../strategies/race-detection-strategy/patterns/PatternRegistry.js';

/**
 * Detects specific race condition patterns
 */
export class RacePatternMatcher {
  constructor() {
    this.registry = new PatternRegistry();
    // The unified registry returns an array of pattern objects
    this.patterns = this.registry.getAllPatterns();
  }

  /**
   * Detect all patterns in a race
   * @param {Object} race - Race condition object
   * @returns {Array} - Detected patterns
   */
  detectPatterns(race) {
    const detected = [];
    const [a1, a2] = race.accesses || [];
    const ctx = { race, type: race.type };

    for (const pattern of this.patterns) {
      // Compatibility check: either use the original 'detect' or the unified 'matcher'
      const isMatch = pattern.detect ? pattern.detect(race) : pattern.matcher(a1, a2, ctx);
      
      if (isMatch) {
        detected.push({
          key: pattern.type,
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
    return this.patterns.map(p => ({
      key: p.type,
      name: p.name
    }));
  }

  /**
   * Add a custom pattern
   * @param {string} key - Pattern key
   * @param {string} name - Pattern name
   * @param {Function} detectFn - Detection function
   */
  addPattern(key, name, detectFn) {
    this.registry.register(key, { name, detect: detectFn, matcher: (a1, a2, ctx) => detectFn(ctx.race) });
    this.patterns = this.registry.getAllPatterns();
  }
}

export default RacePatternMatcher;

/**
 * @fileoverview race-pattern-matcher.js
 * 
 * Backward compatibility wrapper.
 * Use './index.js' for new code.
 * 
 * @deprecated Use './index.js' instead
 * @module race-detector/race-pattern-matcher
 */

// Create a simple default export for backward compatibility
class RacePatternMatcher {
  constructor() {
    this.patterns = [];
  }
  
  addPattern(pattern) {
    this.patterns.push(pattern);
  }
  
  match(code) {
    return this.patterns.filter(p => p.test(code));
  }
}

export { RacePatternMatcher };
export default RacePatternMatcher;

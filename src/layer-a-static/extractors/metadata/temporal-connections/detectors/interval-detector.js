/**
 * @fileoverview Interval Detector
 * 
 * Detects setInterval patterns in code.
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections/detectors/interval-detector
 */

/**
 * Result of an interval detection
 * @typedef {Object} IntervalDetection
 * @property {string} type - Always 'setInterval'
 * @property {boolean} recurring - Always true
 * @property {number|'unknown'} [interval] - Interval in milliseconds if detectable
 * @property {string} [intervalCategory] - 'fast' | 'normal' | 'slow' based on interval
 */

/**
 * Interval categories
 * @enum {string}
 */
const IntervalCategory = {
  FAST: 'fast',
  NORMAL: 'normal',
  SLOW: 'slow'
};

/**
 * Categorizes an interval value
 * @param {number} interval - Interval in milliseconds
 * @returns {string} Interval category
 */
function categorizeInterval(interval) {
  if (interval <= 100) return IntervalCategory.FAST;
  if (interval <= 1000) return IntervalCategory.NORMAL;
  return IntervalCategory.SLOW;
}

/**
 * Detects setInterval patterns in code
 * 
 * @implements {TemporalDetectorStrategy}
 * @param {string} code - Source code to analyze
 * @returns {IntervalDetection[]} Array of detected intervals
 * 
 * @example
 * const code = 'setInterval(() => update(), 5000)';
 * const intervals = detectIntervals(code);
 * // [{ type: 'setInterval', recurring: true, interval: 5000, intervalCategory: 'slow' }]
 */
export function detectIntervals(code) {
  const intervals = [];
  
  // Find all setInterval calls
  const intervalPattern = /setInterval\s*\(\s*[^,]+,\s*(\d+)/g;
  let match;
  
  while ((match = intervalPattern.exec(code)) !== null) {
    const interval = parseInt(match[1], 10);
    
    intervals.push({
      type: 'setInterval',
      recurring: true,
      interval,
      intervalCategory: categorizeInterval(interval)
    });
  }
  
  // Detect setInterval without explicit interval value
  const genericPattern = /setInterval\s*\(/g;
  const genericMatches = code.match(genericPattern) || [];
  const explicitMatches = intervals.length;
  
  // Add generic intervals for any unmatched setInterval calls
  const unmatchedCount = Math.max(0, genericMatches.length - explicitMatches);
  for (let i = 0; i < unmatchedCount; i++) {
    intervals.push({
      type: 'setInterval',
      recurring: true
    });
  }
  
  return intervals;
}

/**
 * Default export for strategy pattern usage
 * @type {TemporalDetectorStrategy}
 */
export default {
  name: 'interval',
  detect: detectIntervals,
  supports: (code) => /setInterval\s*\(/.test(code)
};

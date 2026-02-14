/**
 * @fileoverview Timeout Detector
 * 
 * Detects setTimeout patterns in code.
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections/detectors/timeout-detector
 */

/**
 * Result of a timeout detection
 * @typedef {Object} TimeoutDetection
 * @property {string} type - Always 'setTimeout'
 * @property {number|'unknown'} delay - Delay in milliseconds
 * @property {string} delayCategory - 'immediate' | 'fast' | 'normal' | 'slow'
 */

/**
 * Delay categories for timeouts
 * @enum {string}
 */
const DelayCategory = {
  IMMEDIATE: 'immediate',
  FAST: 'fast',
  NORMAL: 'normal',
  SLOW: 'slow'
};

/**
 * Categorizes a delay value
 * @param {number} delay - Delay in milliseconds
 * @returns {string} Delay category
 */
function categorizeDelay(delay) {
  if (delay === 0) return DelayCategory.IMMEDIATE;
  if (delay <= 100) return DelayCategory.FAST;
  if (delay <= 1000) return DelayCategory.NORMAL;
  return DelayCategory.SLOW;
}

/**
 * Detects setTimeout patterns in code
 * 
 * @implements {TemporalDetectorStrategy}
 * @param {string} code - Source code to analyze
 * @returns {TimeoutDetection[]} Array of detected timeouts
 * 
 * @example
 * const code = 'setTimeout(() => console.log("hi"), 1000)';
 * const timeouts = detectTimeouts(code);
 * // [{ type: 'setTimeout', delay: 1000, delayCategory: 'normal' }]
 */
export function detectTimeouts(code) {
  const timeouts = [];
  
  // setTimeout patterns with callback and delay
  const timeoutPattern = /setTimeout\s*\(\s*(?:function|=>|\w+)/g;
  const timeoutMatches = code.match(timeoutPattern) || [];
  
  // Find all setTimeout calls with their delays
  const fullPattern = /setTimeout\s*\(\s*[^,]+,\s*(\d+)/g;
  let match;
  
  while ((match = fullPattern.exec(code)) !== null) {
    const delay = parseInt(match[1], 10);
    
    timeouts.push({
      type: 'setTimeout',
      delay,
      delayCategory: categorizeDelay(delay)
    });
  }
  
  // Handle setTimeout without explicit delay (defaults to 0)
  const noDelayPattern = /setTimeout\s*\(\s*(?:function|\([^)]*\)\s*=>|\w+\s*\)\s*[,)]/g;
  const noDelayMatches = code.match(noDelayPattern) || [];
  const explicitMatches = timeouts.length;
  
  // Add unknown delays for any unmatched setTimeout calls
  const unmatchedCount = Math.max(0, timeoutMatches.length - explicitMatches);
  for (let i = 0; i < unmatchedCount; i++) {
    timeouts.push({
      type: 'setTimeout',
      delay: 'unknown',
      delayCategory: DelayCategory.IMMEDIATE
    });
  }
  
  return timeouts;
}

/**
 * Default export for strategy pattern usage
 * @type {TemporalDetectorStrategy}
 */
export default {
  name: 'timeout',
  detect: detectTimeouts,
  supports: (code) => /setTimeout\s*\(/.test(code)
};

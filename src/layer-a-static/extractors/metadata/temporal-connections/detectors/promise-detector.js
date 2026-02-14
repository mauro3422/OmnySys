/**
 * @fileoverview Promise Detector
 * 
 * Detects Promise patterns including:
 * - async/await
 * - Promise chains (.then/.catch/.finally)
 * - Promise.all, Promise.race, Promise.allSettled
 * - Promise construction
 * 
 * @module layer-a-static/extractors/metadata/temporal-connections/detectors/promise-detector
 */

/**
 * Promise detection result
 * @typedef {Object} PromiseDetection
 * @property {boolean} isAsync - Function is declared async
 * @property {boolean} hasAwait - Contains await statements
 * @property {boolean} hasPromiseChain - Uses .then/.catch/.finally
 * @property {boolean} hasPromiseAll - Uses Promise.all
 * @property {boolean} hasPromiseRace - Uses Promise.race
 * @property {boolean} hasPromiseAllSettled - Uses Promise.allSettled
 * @property {boolean} hasNewPromise - Constructs new Promise
 * @property {ParallelOperation[]} parallelOperations - Detected parallel operations
 * @property {SequentialOperation[]} sequentialOperations - Detected sequential operations
 */

/**
 * @typedef {Object} ParallelOperation
 * @property {string} type - Operation type
 * @property {number} parallelCalls - Number of parallel calls
 * @property {string[]} calls - Call details
 */

/**
 * @typedef {Object} SequentialOperation
 * @property {string} type - Operation type
 * @property {number} count - Number of sequential operations
 * @property {string} pattern - Pattern description
 */

/**
 * Detects Promise patterns in code
 * 
 * @implements {TemporalDetectorStrategy}
 * @param {string} code - Source code to analyze
 * @param {Object} [functionInfo] - Optional function metadata
 * @param {boolean} [functionInfo.isAsync] - Whether function is async
 * @returns {PromiseDetection} Promise pattern detection result
 * 
 * @example
 * const code = 'async function fetch() { await Promise.all([a(), b()]); }';
 * const patterns = detectPromises(code, { isAsync: true });
 * // { isAsync: true, hasAwait: true, hasPromiseAll: true, ... }
 */
export function detectPromises(code, functionInfo = {}) {
  return {
    isAsync: functionInfo.isAsync || /async\s+function/.test(code) || /^async\s*[\(]/.test(code),
    hasAwait: /await\s+/.test(code),
    hasPromiseChain: /\.then\s*\(|\.catch\s*\(|\.finally\s*\(/.test(code),
    hasPromiseAll: /Promise\.all\s*\(/.test(code),
    hasPromiseRace: /Promise\.race\s*\(/.test(code),
    hasPromiseAllSettled: /Promise\.allSettled\s*\(/.test(code),
    hasNewPromise: /new\s+Promise\s*\(/.test(code),
    parallelOperations: detectParallelOperations(code),
    sequentialOperations: detectSequentialOperations(code)
  };
}

/**
 * Detects parallel Promise operations
 * @param {string} code - Source code
 * @returns {ParallelOperation[]} Detected parallel operations
 */
function detectParallelOperations(code) {
  const operations = [];
  
  // Promise.all indicates explicit parallelism
  const promiseAllPattern = /Promise\.all\s*\(\s*\[([^\]]+)\]/g;
  let match;
  
  while ((match = promiseAllPattern.exec(code)) !== null) {
    const calls = match[1].split(',').map(c => c.trim()).filter(Boolean);
    if (calls.length > 0) {
      operations.push({
        type: 'Promise.all',
        parallelCalls: calls.length,
        calls: calls.slice(0, 5) // First 5 for brevity
      });
    }
  }
  
  // Array of promises followed by await
  const arrayPromisePattern = /await\s+Promise\.all\s*\(/;
  if (arrayPromisePattern.test(code) && !operations.some(o => o.type === 'Promise.all')) {
    operations.push({
      type: 'await-Promise.all',
      pattern: 'explicit-parallel'
    });
  }
  
  // Promise.race operations
  const racePattern = /Promise\.race\s*\(\s*\[([^\]]+)\]/g;
  while ((match = racePattern.exec(code)) !== null) {
    const calls = match[1].split(',').map(c => c.trim()).filter(Boolean);
    if (calls.length > 0) {
      operations.push({
        type: 'Promise.race',
        parallelCalls: calls.length,
        calls: calls.slice(0, 5)
      });
    }
  }
  
  return operations;
}

/**
 * Detects sequential operations
 * @param {string} code - Source code
 * @returns {SequentialOperation[]} Detected sequential operations
 */
function detectSequentialOperations(code) {
  const operations = [];
  
  // Multiple consecutive awaits
  const awaitPattern = /await\s+\w+/g;
  const awaits = code.match(awaitPattern) || [];
  if (awaits.length > 1) {
    operations.push({
      type: 'sequential-awaits',
      count: awaits.length,
      pattern: 'sequential-by-default'
    });
  }
  
  // Promise chains
  const chainPattern = /\.then\s*\([^)]*\)\s*\.\w+/g;
  const chains = code.match(chainPattern) || [];
  if (chains.length > 0) {
    operations.push({
      type: 'promise-chain',
      count: chains.length,
      pattern: 'sequential-chain'
    });
  }
  
  return operations;
}

/**
 * Default export for strategy pattern usage
 * @type {TemporalDetectorStrategy}
 */
export default {
  name: 'promise',
  detect: detectPromises,
  supports: (code) => /(?:async|await|Promise\.)/.test(code)
};

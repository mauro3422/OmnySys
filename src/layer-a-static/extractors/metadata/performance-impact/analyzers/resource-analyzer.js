/**
 * @fileoverview Resource Usage Analyzer
 * 
 * Estimates resource usage including network, disk, memory,
 * and DOM operations in the code.
 * 
 * @module performance-impact/analyzers/resource-analyzer
 */

/**
 * Memory usage patterns
 * @const {Array<{pattern: RegExp, level: string}>}
 */
const MEMORY_PATTERNS = [
  { pattern: /new\s+Array\s*\(\s*\d{4,}/, level: 'high' },
  { pattern: /new\s+(?:Image|Blob|File)\s*\(/, level: 'medium' },
  { pattern: /Buffer\.(?:alloc|from)\s*\(/, level: 'medium' },
  { pattern: /createCanvas|getContext\s*\(\s*['"]2d['"]/, level: 'high' }
];

/**
 * Analyzes resource usage in code
 * 
 * @class ResourceAnalyzer
 */
export class ResourceAnalyzer {
  /**
   * Estimates resource usage from code
   * 
   * @param {string} code - Source code to analyze
   * @returns {Object} Resource usage metrics
   */
  analyze(code) {
    const resources = {
      network: false,
      disk: false,
      memory: 'low',
      dom: false
    };

    const estimates = {
      async: false,
      expensiveWithCache: false
    };

    this._detectNetworkUsage(code, resources, estimates);
    this._detectDiskUsage(code, resources);
    this._detectMemoryUsage(code, resources);
    this._detectCaching(code, estimates);

    return { resources, estimates };
  }

  /**
   * Detects network-related operations
   * @private
   * @param {string} code - Source code
   * @param {Object} resources - Resources object to populate
   * @param {Object} estimates - Estimates object to populate
   */
  _detectNetworkUsage(code, resources, estimates) {
    if (/fetch\s*\(|axios\.|request\.|XMLHttpRequest/.test(code)) {
      resources.network = true;
      estimates.async = true;
    }
  }

  /**
   * Detects disk/storage operations
   * @private
   * @param {string} code - Source code
   * @param {Object} resources - Resources object to populate
   */
  _detectDiskUsage(code, resources) {
    if (/localStorage|sessionStorage|indexedDB|fs\./.test(code)) {
      resources.disk = true;
    }
  }

  /**
   * Detects memory-intensive operations
   * @private
   * @param {string} code - Source code
   * @param {Object} resources - Resources object to populate
   */
  _detectMemoryUsage(code, resources) {
    for (const { pattern, level } of MEMORY_PATTERNS) {
      if (pattern.test(code)) {
        resources.memory = level;
      }
    }
  }

  /**
   * Detects caching patterns
   * @private
   * @param {string} code - Source code
   * @param {Object} estimates - Estimates object to populate
   */
  _detectCaching(code, estimates) {
    if (/memoize|cache|lazy/.test(code)) {
      estimates.expensiveWithCache = true;
    }
  }
}

export default ResourceAnalyzer;

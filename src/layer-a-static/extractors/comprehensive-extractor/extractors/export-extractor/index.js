/**
 * @fileoverview Export Extractor - Main Entry Point
 * 
 * Extracts all export patterns: ES6, CommonJS, re-exports
 * 
 * @module export-extractor
 */

import { findExports } from '../../parsers/ast-parser.js';
import { createLogger } from '../../../../../utils/logger.js';
import { parseCommonJSExports } from './parsers/commonjs-parser.js';
import { categorizeES6Exports } from './parsers/es6-parser.js';
import { analyzeExportPatterns, extractBarrelPattern } from './analyzers/pattern-analyzer.js';
import { calculateExportMetrics, extractUnusedExports } from './metrics/export-metrics.js';

const logger = createLogger('OmnySys:export-extractor');

/**
 * Extract all exports from code
 * @param {string} code - Source code
 * @param {Object} options - Options
 * @returns {Object} Extraction results
 */
export function extractExports(code, options = {}) {
  try {
    const exports = findExports(code);
    const categorized = categorizeES6Exports(exports);
    const patterns = analyzeExportPatterns(exports);
    const assignments = parseCommonJSExports(code);
    const metrics = calculateExportMetrics(exports, assignments);
    
    return {
      all: exports,
      ...categorized,
      assignments,
      patterns,
      metrics,
      _metadata: {
        extractedAt: new Date().toISOString(),
        success: true
      }
    };
  } catch (error) {
    logger.warn(`Error extracting exports: ${error.message}`);
    return createErrorResult(error);
  }
}

/**
 * Create error result
 */
function createErrorResult(error) {
  return {
    all: [],
    named: [],
    defaultExport: null,
    reExports: [],
    exportAll: [],
    assignments: [],
    patterns: {},
    metrics: {},
    _metadata: { error: error.message, success: false }
  };
}

// Re-export all functions
export { parseCommonJSExports } from './parsers/commonjs-parser.js';
export { categorizeES6Exports, determineExportStyle } from './parsers/es6-parser.js';
export { analyzeExportPatterns, extractBarrelPattern } from './analyzers/pattern-analyzer.js';
export { calculateExportMetrics, extractUnusedExports } from './metrics/export-metrics.js';

// Default export
export default {
  extractExports,
  parseCommonJSExports,
  categorizeES6Exports,
  analyzeExportPatterns,
  extractBarrelPattern,
  calculateExportMetrics,
  extractUnusedExports
};

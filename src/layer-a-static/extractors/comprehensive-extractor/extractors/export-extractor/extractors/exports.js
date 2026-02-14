/**
 * @fileoverview exports.js
 * 
 * Main export extraction functionality
 * 
 * @module comprehensive-extractor/extractors/export-extractor/extractors/exports
 * @phase Layer A - Enhanced
 */

import { findExports } from '../../parsers/ast-parser.js';
import { createLogger } from '#utils/logger.js';
import { categorizeExports, analyzeExportPatterns, calculateExportMetrics } from '../parsers/categorizer.js';
import { extractExportAssignments } from '../parsers/assignments.js';

const logger = createLogger('OmnySys:export-extractor');

/**
 * Extract all exports from code
 * 
 * @param {string} code - Source code
 * @param {Object} options - Extraction options
 * @returns {Object} - Export extraction results
 */
export function extractExports(code, options = {}) {
  try {
    const exports = findExports(code);
    
    // Categorize exports
    const categorized = categorizeExports(exports);
    
    // Analyze export patterns
    const patterns = analyzeExportPatterns(exports);
    
    // Extract export assignments (module.exports)
    const assignments = extractExportAssignments(code);
    
    // Calculate metrics
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
}

export { extractExportAssignments };

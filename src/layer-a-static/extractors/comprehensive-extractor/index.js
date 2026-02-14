/**
 * @fileoverview index.js
 * 
 * Public API for comprehensive-extractor module
 * Provides backward-compatible exports and convenient access to all extractors
 * 
 * @module comprehensive-extractor
 * @phase Layer A - Enhanced
 */

// ============================================
// MAIN EXTRACTOR CLASS
// ============================================

export { 
  ComprehensiveExtractor, 
  createExtractor,
  EXTRACTOR_STATS,
  DEFAULT_CONFIG 
} from './ComprehensiveExtractor.js';

// ============================================
// INDIVIDUAL EXTRACTORS
// ============================================

export {
  extractFunctions,
  extractFunctionCalls,
  extractRecursiveFunctions,
  extractHigherOrderFunctions,
  extractAsyncPatterns
} from './extractors/function-extractor.js';

export {
  extractClasses,
  extractClassMethods,
  extractClassProperties,
  extractInheritanceHierarchy,
  extractMixins
} from './extractors/class-extractor.js';

export {
  extractImports,
  extractDynamicImports,
  extractImportAliases,
  extractBarrelImports,
  extractUnusedImports
} from './extractors/import-extractor.js';

export {
  extractExports,
  extractExportAssignments,
  extractExportDeclarations,
  extractBarrelPattern,
  extractDefaultExportDetails,
  extractUnusedExports
} from './extractors/export-extractor.js';

// ============================================
// PARSER UTILITIES
// ============================================

export {
  parseAST,
  findNodesByType,
  findFunctions,
  findClasses,
  findImports,
  findExports,
  findMethods,
  findArrowFunctions,
  PARSER_CONFIG
} from './parsers/ast-parser.js';

// ============================================
// BACKWARD COMPATIBILITY
// ============================================

import { ComprehensiveExtractor, EXTRACTOR_STATS as STATS } from './ComprehensiveExtractor.js';

/**
 * Extract comprehensive metadata (legacy function interface)
 * Maintains backward compatibility with the original API
 * 
 * @param {string} filePath - Path to the file
 * @param {string} code - Source code
 * @param {Object} options - Extraction options
 * @returns {Object} - Comprehensive extraction results
 */
export function extractComprehensiveMetadata(filePath, code, options = {}) {
  const extractor = new ComprehensiveExtractor(options);
  return extractor.extract(filePath, code, options);
}

/**
 * Legacy statistics export
 * @deprecated Use EXTRACTOR_STATS from ComprehensiveExtractor.js
 */
export const EXTRACTOR_STATS = STATS;

/**
 * Default export for the module
 */
export default {
  ComprehensiveExtractor,
  createExtractor,
  extractComprehensiveMetadata,
  EXTRACTOR_STATS
};

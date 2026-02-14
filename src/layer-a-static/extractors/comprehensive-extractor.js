/**
 * @fileoverview comprehensive-extractor.js (LEGACY)
 * 
 * ⚠️  DEPRECATED: This file is kept for backward compatibility.
 * Please use the new modular structure:
 *   import { ComprehensiveExtractor } from './comprehensive-extractor/index.js';
 * 
 * This file now re-exports from the modular architecture.
 * 
 * @module extractors/comprehensive-extractor
 * @phase Layer A - Enhanced
 * @deprecated Use comprehensive-extractor/index.js
 */

// ============================================
// LEGACY RE-EXPORTS
// Re-exports from the new modular structure
// ============================================

export {
  // Main class and factory
  ComprehensiveExtractor,
  createExtractor,
  
  // Legacy function
  extractComprehensiveMetadata,
  
  // Statistics
  EXTRACTOR_STATS,
  DEFAULT_CONFIG,
  
  // Individual extractors (new in v3)
  extractFunctions,
  extractFunctionCalls,
  extractRecursiveFunctions,
  extractHigherOrderFunctions,
  extractAsyncPatterns,
  
  extractClasses,
  extractClassMethods,
  extractClassProperties,
  extractInheritanceHierarchy,
  extractMixins,
  
  extractImports,
  extractDynamicImports,
  extractImportAliases,
  extractBarrelImports,
  extractUnusedImports,
  
  extractExports,
  extractExportAssignments,
  extractExportDeclarations,
  extractBarrelPattern,
  extractDefaultExportDetails,
  extractUnusedExports,
  
  // Parser utilities
  parseAST,
  findNodesByType,
  findFunctions,
  findClasses,
  findImports,
  findExports,
  findMethods,
  findArrowFunctions,
  PARSER_CONFIG
} from './comprehensive-extractor/index.js';

// ============================================
// DEFAULT EXPORT (maintains compatibility)
// ============================================

import { extractComprehensiveMetadata, EXTRACTOR_STATS as STATS } from './comprehensive-extractor/index.js';

export default extractComprehensiveMetadata;

// Maintain backward compatibility with direct property access
export const EXTRACTOR_STATS = STATS;

// ============================================
// MIGRATION GUIDE
// ============================================

/**
 * MIGRATION GUIDE: comprehensive-extractor.js
 * 
 * Old usage (still works):
 *   import extractComprehensiveMetadata from './extractors/comprehensive-extractor.js';
 *   const metadata = extractComprehensiveMetadata(filePath, code);
 * 
 * New recommended usage:
 *   import { ComprehensiveExtractor } from './extractors/comprehensive-extractor/index.js';
 *   const extractor = new ComprehensiveExtractor();
 *   const metadata = extractor.extract(filePath, code);
 * 
 * New modular usage (granular extraction):
 *   import { extractFunctions, extractClasses } from './extractors/comprehensive-extractor/index.js';
 *   const functions = extractFunctions(code);
 *   const classes = extractClasses(code);
 * 
 * Benefits of new architecture:
 *   - Tree-shakeable imports
 *   - Individual extractors can be used standalone
 *   - Better separation of concerns
 *   - Easier to extend with new extractors
 *   - Better testability
 *   - Clearer API surface
 */

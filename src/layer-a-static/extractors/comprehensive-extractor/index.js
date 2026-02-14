/**
 * @fileoverview Comprehensive Extractor Module
 * 
 * @module comprehensive-extractor
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

import { ComprehensiveExtractor } from './ComprehensiveExtractor.js';

// === Legacy function for backward compatibility ===
/**
 * Extract comprehensive metadata from a file (legacy API)
 * @param {string} filePath - Path to the file
 * @param {string} code - Source code content
 * @param {object} options - Extraction options
 * @returns {object} Comprehensive metadata
 * @deprecated Use ComprehensiveExtractor class instead
 */
export function extractComprehensiveMetadata(filePath, code, options = {}) {
  const extractor = new ComprehensiveExtractor(options);
  return extractor.extract(filePath, code);
}

// === Core ===
export { 
  ComprehensiveExtractor,
  createExtractor
} from './ComprehensiveExtractor.js';

// === Config ===
export {
  DEFAULT_CONFIG,
  EXTRACTOR_STATS,
  DETAIL_LEVELS,
  mergeConfig
} from './config/index.js';

// === Metadata ===
export {
  extractBasicMetadata,
  detectFileCategory,
  calculateFileIndicators
} from './metadata/index.js';

// === Metrics ===
export {
  calculateMetrics,
  calculateComplexityScore
} from './metrics/index.js';

// === Patterns ===
export {
  detectPatterns,
  detectPatternsByName
} from './patterns/index.js';

// === Completeness ===
export {
  calculateCompleteness,
  shouldNeedLLM,
  countActiveExtractors,
  assessQuality
} from './completeness/index.js';

// === Extractors (Functions) ===
export {
  extractFunctions,
  extractFunctionCalls,
  extractRecursiveFunctions,
  extractHigherOrderFunctions,
  extractAsyncPatterns
} from './extractors/function-extractor.js';

// === Extractors (Classes) ===
export {
  extractClasses,
  extractClassMethods,
  extractClassProperties,
  extractInheritanceHierarchy,
  calculateInheritanceDepth,
  extractMixins,
  extractClassBody,
  extractImplements,
  extractDecorators
} from './extractors/class-extractor/index.js';

// === Extractors (Imports) ===
export {
  extractImports,
  extractDynamicImports,
  extractImportAliases,
  extractBarrelImports,
  extractUnusedImports
} from './extractors/import-extractor.js';

// === Extractors (Exports) ===
export {
  extractExports,
  parseCommonJSExports,
  categorizeES6Exports,
  determineExportStyle,
  analyzeExportPatterns,
  extractBarrelPattern,
  calculateExportMetrics,
  extractUnusedExports
} from './extractors/export-extractor/index.js';

// === Parser Utilities ===
export {
  PARSER_CONFIG,
  parseAST,
  findNodesByType,
  findFunctions,
  findArrowFunctions,
  findClasses,
  findImports,
  findExports,
  findMethods
} from './parsers/ast-parser.js';

// === Default Export ===
// Legacy default export for backward compatibility
export default extractComprehensiveMetadata;

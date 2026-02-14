/**
 * @fileoverview Comprehensive Extractor Module
 * 
 * @module comprehensive-extractor
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

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

// === Extractors (existing) ===
export {
  extractFunctions,
  extractAsyncPatterns
} from './extractors/function-extractor.js';

export { extractClasses } from './extractors/class-extractor.js';
export { extractImports } from './extractors/import-extractor.js';
export { extractExports } from './extractors/export-extractor.js';

// === Default Export ===
export { ComprehensiveExtractor as default } from './ComprehensiveExtractor.js';

/**
 * TypeScript Extractor Module
 * 
 * Extracts TypeScript definitions and detects connections:
 * - Interfaces, types, classes, enums, generics
 * - Interface implementations and extensions
 * - Type imports and exports
 * - Potential breaking changes
 */

// Main extraction function
export { extractTypeScriptDefinitions } from './extractor.js';

// Single file and multi-file extractors
export {
  extractTypeScriptFromFile,
  detectAllTypeScriptConnections
} from './extractors/index.js';

// Connection detectors
export {
  detectInterfaceImplementations,
  detectInterfaceExtensions,
  detectTypeUsages,
  detectPotentialBreakingChanges
} from './connections/index.js';

// Parsers (for advanced usage)
export {
  extractInterfaces,
  extractTypes,
  extractClasses,
  extractEnums,
  extractGenerics,
  extractImports,
  extractExports
} from './parsers/index.js';

// Utilities
export { getLineNumber } from './utils/index.js';

/**
 * typescript-extractor.js
 * @deprecated Use ./typescript/index.js directly
 * 
 * This file is a backward compatibility wrapper.
 * Please update your imports to use the new modular structure.
 * 
 * Old: import { extractTypeScriptDefinitions } from './typescript-extractor.js';
 * New: import { extractTypeScriptDefinitions } from './typescript/index.js';
 */

export {
  // Main extraction
  extractTypeScriptDefinitions,
  
  // File extractors
  extractTypeScriptFromFile,
  detectAllTypeScriptConnections,
  
  // Connection detectors
  detectInterfaceImplementations,
  detectInterfaceExtensions,
  detectTypeUsages,
  detectPotentialBreakingChanges,
  
  // Parsers
  extractInterfaces,
  extractTypes,
  extractClasses,
  extractEnums,
  extractGenerics,
  extractImports,
  extractExports,
  
  // Utilities
  getLineNumber
} from './typescript/index.js';

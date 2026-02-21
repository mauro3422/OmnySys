/**
 * @fileoverview Branch Extractor (Barrel Export - DEPRECATED)
 * 
 * This file re-exports from the new modular branch-extractor directory.
 * Please update your imports to use the new structure.
 * 
 * @deprecated Use ./branch-extractor/index.js or specific modules
 * @module mcp/tools/generate-tests/branch-extractor-deprecated
 */

export {
  // Main extractor
  extractBranches,
  // Return extraction
  extractReturnExpr,
  extractCaseReturn,
  // Guard finding
  findGuardCondition,
  // Hints parsing
  parseConditionToInputHints,
  // Import resolution
  resolveNeededImports,
  usesImportedConstant,
  // Assertion building
  buildAssertionFromExpr,
  // Test name building
  buildTestName,
  sanitizeName
} from './branch-extractor/index.js';

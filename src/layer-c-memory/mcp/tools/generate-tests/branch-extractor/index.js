/**
 * @fileoverview Branch Extractor - Barrel Export
 * 
 * Extracts branches from function code for test generation
 * 
 * @module mcp/tools/generate-tests/branch-extractor
 */

// Main extractor
export { extractBranches } from './main-extractor.js';

// Return extraction
export { extractReturnExpr, extractCaseReturn } from './return-extractor.js';

// Guard finding
export { findGuardCondition } from './guard-finder.js';

// Hints parsing
export { parseConditionToInputHints } from './hints-parser.js';

// Import resolution
export { resolveNeededImports, usesImportedConstant } from './import-resolver.js';

// Assertion building
export { buildAssertionFromExpr } from './assertion-builder.js';

// Test name building
export { buildTestName, sanitizeName } from './test-name-builder.js';

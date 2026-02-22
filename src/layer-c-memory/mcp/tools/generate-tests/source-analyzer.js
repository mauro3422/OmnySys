/**
 * @fileoverview Source Code Analyzer (Barrel Export - DEPRECATED)
 *
 * This file re-exports from the new modular source-analyzer directory.
 * Please update your imports to use the new structure:
 *
 * Before:
 *   import { generateSpecificTests } from './source-analyzer.js';
 *
 * After:
 *   import { generateSpecificTests } from './source-analyzer/index.js';
 *   or specific modules from ./source-analyzer/*
 *
 * @deprecated Use ./source-analyzer/index.js or specific analyzer modules
 * @module mcp/tools/generate-tests/source-analyzer-deprecated
 */

export {
  readFunctionSource,
  analyzeSourceForTests,
  generateSpecificTests
} from './source-analyzer/index.js';

export { default } from './source-analyzer/index.js';

/**
 * @fileoverview Test Coverage Analyzer (Barrel Export - DEPRECATED)
 *
 * This file re-exports from the new modular coverage-analyzer directory.
 * Please update your imports to use the new structure:
 *
 * Before:
 *   import { analyzeTestCoverage } from './test-coverage-analyzer.js';
 *
 * After:
 *   import { analyzeTestCoverage } from './coverage-analyzer/index.js';
 *   or specific modules from ./coverage-analyzer/*
 *
 * @deprecated Use ./coverage-analyzer/index.js or specific analyzer modules
 * @module mcp/tools/generate-tests/test-coverage-analyzer-deprecated
 */

export {
  analyzeTestCoverage,
  compareWithGeneratedTests
} from './coverage-analyzer/index.js';

export { default } from './coverage-analyzer/index.js';

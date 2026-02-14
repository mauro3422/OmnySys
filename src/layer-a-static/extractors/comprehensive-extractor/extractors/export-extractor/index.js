/**
 * @fileoverview index.js
 * 
 * Export Extractor - Main entry point (backward compatible)
 * Extracts all export patterns
 * Handles ES6 exports, CommonJS exports, and re-exports
 * 
 * @module comprehensive-extractor/extractors/export-extractor
 * @phase Layer A - Enhanced
 */

import { extractExports, extractExportAssignments } from './extractors/exports.js';
import { 
  extractExportDeclarations, 
  extractBarrelPattern, 
  extractDefaultExportDetails,
  extractUnusedExports 
} from './extractors/details.js';

export {
  extractExports,
  extractExportAssignments,
  extractExportDeclarations,
  extractBarrelPattern,
  extractDefaultExportDetails,
  extractUnusedExports
};

export default {
  extractExports,
  extractExportAssignments,
  extractExportDeclarations,
  extractBarrelPattern,
  extractDefaultExportDetails,
  extractUnusedExports
};

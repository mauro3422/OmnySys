/**
 * @fileoverview index.js
 * 
 * Class Extractor - Main entry point (backward compatible)
 * Extracts class-related constructs
 * Handles class declarations, inheritance, methods, and properties
 * 
 * @module comprehensive-extractor/extractors/class-extractor
 * @phase Layer A - Enhanced
 */

import { extractClasses, extractClassMethods, extractClassProperties } from './extractors/classes.js';
import { extractInheritanceHierarchy, extractMixins } from './utils/inheritance.js';

export {
  extractClasses,
  extractClassMethods,
  extractClassProperties,
  extractInheritanceHierarchy,
  extractMixins
};

export default {
  extractClasses,
  extractClassMethods,
  extractClassProperties,
  extractInheritanceHierarchy,
  extractMixins
};

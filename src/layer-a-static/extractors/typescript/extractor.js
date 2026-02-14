/**
 * extractor.js
 * Main TypeScript definitions extraction
 * 
 * Detects:
 * - Interfaces and their implementations
 * - Type aliases and their usages
 * - Interface inheritance
 * - Generic constraints
 * - Changes that break contracts
 */

import {
  extractInterfaces,
  extractTypes,
  extractClasses,
  extractEnums,
  extractGenerics,
  extractImports,
  extractExports
} from './parsers/index.js';

/**
 * Extract TypeScript definitions from code
 * @param {string} code - Source code
 * @returns {Object} - { interfaces: [], types: [], classes: [], generics: [] }
 */
export function extractTypeScriptDefinitions(code) {
  const interfaces = extractInterfaces(code);
  const types = extractTypes(code);
  const classes = extractClasses(code);
  const enums = extractEnums(code);
  const generics = extractGenerics(code);
  const imports = extractImports(code);
  const exports = extractExports(code);

  return {
    interfaces,
    types,
    classes,
    enums,
    generics,
    imports,
    exports,
    all: [
      ...interfaces,
      ...types,
      ...classes,
      ...enums,
      ...generics
    ]
  };
}

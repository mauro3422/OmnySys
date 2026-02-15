/**
 * @fileoverview Parser Test Factory - Constants
 */

export const PARSER_TEST_CONSTANTS = {
  VALID_JS_FILE: 'test.js',
  VALID_TS_FILE: 'test.ts',
  VALID_JSX_FILE: 'test.jsx',
  VALID_TSX_FILE: 'test.tsx',
  INVALID_FILE: 'test.css',
  
  IMPORT_TYPES: ['esm', 'commonjs', 'dynamic'],
  EXPORT_TYPES: ['named', 'default', 'declaration', 'reexport'],
  FUNCTION_TYPES: ['declaration', 'arrow', 'expression', 'method'],
  DEFINITION_TYPES: ['function', 'class', 'arrow', 'expression', 'method'],
  
  COMMON_PATTERNS: {
    FUNCTION: /function\s+\w+\s*\(/,
    ARROW: /const\s+\w+\s*=\s*\(/,
    CLASS: /class\s+\w+/,
    IMPORT: /import\s+.*from\s+['"]/,
    EXPORT: /export\s+(default\s+)?/,
    REQUIRE: /require\s*\(\s*['"]/
  }
};

// Mock factory for creating test dependencies


/**
 * @fileoverview ast-parser.js
 * 
 * AST Parser - Handles all AST operations for code extraction
 * Provides a unified interface for parsing and traversing code
 * 
 * @module comprehensive-extractor/parsers/ast-parser
 * @phase Layer A - Enhanced
 */

import { createLogger } from '#utils/logger.js';

const logger = createLogger('OmnySys:ast-parser');

/**
 * Parser configuration options
 */
export const PARSER_CONFIG = {
  // ECMAScript version
  ecmaVersion: 'latest',
  // Source type (module for ES6, script for CommonJS)
  sourceType: 'module',
  // Enable all plugins for maximum compatibility
  plugins: [
    'jsx',
    'typescript',
    'decorators-legacy',
    'classProperties',
    'asyncGenerators',
    'dynamicImport',
    'optionalChaining',
    'nullishCoalescing',
    'topLevelAwait'
  ]
};

/**
 * Parse code into AST (placeholder implementation)
 * In real implementation, this would use a parser like @babel/parser or acorn
 * 
 * @param {string} code - Source code to parse
 * @param {Object} options - Parse options
 * @returns {Object|null} - AST object or null if parsing fails
 */
export function parseAST(code, options = {}) {
  try {
    // This is a simplified placeholder
    // Real implementation would use @babel/parser or similar
    const config = { ...PARSER_CONFIG, ...options };
    
    // Return a minimal structure that extractors can work with
    return {
      type: 'File',
      program: {
        type: 'Program',
        body: [],
        sourceType: config.sourceType
      },
      _raw: code,
      _config: config
    };
  } catch (error) {
    logger.warn(`Failed to parse code: ${error.message}`);
    return null;
  }
}

/**
 * Extract all nodes of a specific type from AST
 * 
 * @param {Object} ast - AST object
 * @param {string} nodeType - Type of node to find
 * @returns {Array} - Array of matching nodes
 */
export function findNodesByType(ast, nodeType) {
  if (!ast || !ast._raw) return [];
  
  const nodes = [];
  const code = ast._raw;
  
  // Simplified regex-based extraction for the modular architecture
  // Real implementation would traverse the AST properly
  const patterns = {
    FunctionDeclaration: /function\s+(\w+)\s*\(/g,
    ArrowFunction: /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    ClassDeclaration: /class\s+(\w+)(?:\s+extends\s+(\w+))?/g,
    ImportDeclaration: /import\s+.*?from\s+['"]([^'"]+)['"];?/g,
    ExportDeclaration: /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type)?\s*(\w+)?/g,
    MethodDefinition: /(\w+)\s*\([^)]*\)\s*\{/g
  };
  
  const pattern = patterns[nodeType];
  if (pattern) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      nodes.push({
        type: nodeType,
        name: match[1],
        start: match.index,
        end: match.index + match[0].length,
        raw: match[0]
      });
    }
  }
  
  return nodes;
}

/**
 * Find all function declarations in code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of function info
 */
export function findFunctions(code) {
  const functions = [];
  
  // Function declarations: function name() {}
  const funcDeclPattern = /function\s+(\w+)\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{/g;
  let match;
  while ((match = funcDeclPattern.exec(code)) !== null) {
    functions.push({
      type: 'FunctionDeclaration',
      name: match[1],
      isAsync: false,
      isGenerator: false,
      start: match.index,
      params: extractParams(match[0])
    });
  }
  
  // Async function declarations
  const asyncFuncPattern = /async\s+function\s+(\w+)\s*\([^)]*\)/g;
  while ((match = asyncFuncPattern.exec(code)) !== null) {
    functions.push({
      type: 'FunctionDeclaration',
      name: match[1],
      isAsync: true,
      isGenerator: false,
      start: match.index,
      params: extractParams(match[0])
    });
  }
  
  return functions;
}

/**
 * Find all class declarations in code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of class info
 */
export function findClasses(code) {
  const classes = [];
  
  // Class declarations
  const classPattern = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
  let match;
  while ((match = classPattern.exec(code)) !== null) {
    classes.push({
      type: 'ClassDeclaration',
      name: match[1],
      superClass: match[2] || null,
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  return classes;
}

/**
 * Find all imports in code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of import info
 */
export function findImports(code) {
  const imports = [];
  
  // ES6 imports: import { x } from 'module'
  const namedImportPattern = /import\s+\{\s*([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g;
  let match;
  while ((match = namedImportPattern.exec(code)) !== null) {
    const names = match[1].split(',').map(n => n.trim().split(' as ')[0].trim());
    imports.push({
      type: 'NamedImport',
      names,
      source: match[2],
      start: match.index
    });
  }
  
  // Default imports: import X from 'module'
  const defaultImportPattern = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = defaultImportPattern.exec(code)) !== null) {
    imports.push({
      type: 'DefaultImport',
      name: match[1],
      source: match[2],
      start: match.index
    });
  }
  
  // Namespace imports: import * as X from 'module'
  const namespacePattern = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = namespacePattern.exec(code)) !== null) {
    imports.push({
      type: 'NamespaceImport',
      name: match[1],
      source: match[2],
      start: match.index
    });
  }
  
  // Side-effect imports: import 'module'
  const sideEffectPattern = /import\s+['"]([^'"]+)['"];?/g;
  while ((match = sideEffectPattern.exec(code)) !== null) {
    imports.push({
      type: 'SideEffectImport',
      source: match[1],
      start: match.index
    });
  }
  
  // CommonJS requires
  const requirePattern = /(?:const|let|var)\s+(\{?[^=]+\}?)\s+=\s+require\(['"]([^'"]+)['"]\);?/g;
  while ((match = requirePattern.exec(code)) !== null) {
    imports.push({
      type: 'CommonJSRequire',
      names: match[1].includes('{') 
        ? match[1].replace(/[{}\s]/g, '').split(',')
        : [match[1].trim()],
      source: match[2],
      start: match.index
    });
  }
  
  return imports;
}

/**
 * Find all exports in code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of export info
 */
export function findExports(code) {
  const exports = [];
  
  // Named exports: export const x = ...
  const namedExportPattern = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
  let match;
  while ((match = namedExportPattern.exec(code)) !== null) {
    exports.push({
      type: 'NamedExport',
      name: match[1],
      start: match.index
    });
  }
  
  // Default export: export default ...
  const defaultPattern = /export\s+default\s+(?:class|function|interface)?\s*(\w+)?/g;
  while ((match = defaultPattern.exec(code)) !== null) {
    exports.push({
      type: 'DefaultExport',
      name: match[1] || 'default',
      start: match.index
    });
  }
  
  // Export all: export * from 'module'
  const exportAllPattern = /export\s+\*\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = exportAllPattern.exec(code)) !== null) {
    exports.push({
      type: 'ExportAll',
      source: match[1],
      start: match.index
    });
  }
  
  // Re-exports: export { x } from 'module'
  const reExportPattern = /export\s+\{\s*([^}]+)\}\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = reExportPattern.exec(code)) !== null) {
    exports.push({
      type: 'ReExport',
      names: match[1].split(',').map(n => n.trim().split(' as ')[0]),
      source: match[2],
      start: match.index
    });
  }
  
  // Module.exports
  const moduleExportsPattern = /module\.exports\s*=\s*(?:\{([^}]+)\}|(\w+))/g;
  while ((match = moduleExportsPattern.exec(code)) !== null) {
    exports.push({
      type: 'CommonJSExport',
      names: match[1] 
        ? match[1].split(',').map(n => n.trim().split(':')[0].trim())
        : [match[2]],
      start: match.index
    });
  }
  
  return exports;
}

/**
 * Extract method definitions from a class body
 * 
 * @param {string} classBody - Class body code
 * @returns {Array} - Array of method definitions
 */
export function findMethods(classBody) {
  const methods = [];
  
  // Method definitions
  const methodPattern = /(?:async\s+)?(?:(?:get|set)\s+)?(\w+|\[\s*[^\]]+\s*\])\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = methodPattern.exec(classBody)) !== null) {
    const isGetter = match[0].includes('get ');
    const isSetter = match[0].includes('set ');
    const isAsync = match[0].includes('async ');
    
    methods.push({
      type: isGetter ? 'getter' : isSetter ? 'setter' : 'method',
      name: match[1].replace(/[\[\]\s']/g, ''),
      isAsync,
      isStatic: false, // Would need more context
      isPrivate: match[1].startsWith('#'),
      start: match.index
    });
  }
  
  // Arrow methods: methodName = () => {}
  const arrowMethodPattern = /(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  while ((match = arrowMethodPattern.exec(classBody)) !== null) {
    methods.push({
      type: 'arrow',
      name: match[1],
      isAsync: match[0].includes('async'),
      isStatic: false,
      start: match.index
    });
  }
  
  return methods;
}

/**
 * Extract arrow functions from code
 * 
 * @param {string} code - Source code
 * @returns {Array} - Array of arrow function info
 */
export function findArrowFunctions(code) {
  const arrows = [];
  
  // Const arrow: const x = () =>
  const constArrowPattern = /const\s+(\w+)\s*=\s*(async\s*)?\([^)]*\)\s*=>/g;
  let match;
  while ((match = constArrowPattern.exec(code)) !== null) {
    arrows.push({
      type: 'ArrowFunction',
      name: match[1],
      isAsync: !!match[2],
      assignment: 'const',
      start: match.index
    });
  }
  
  // Let arrow: let x = () =>
  const letArrowPattern = /let\s+(\w+)\s*=\s*(async\s*)?\([^)]*\)\s*=>/g;
  while ((match = letArrowPattern.exec(code)) !== null) {
    arrows.push({
      type: 'ArrowFunction',
      name: match[1],
      isAsync: !!match[2],
      assignment: 'let',
      start: match.index
    });
  }
  
  return arrows;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractParams(funcSignature) {
  const match = funcSignature.match(/\(([^)]*)\)/);
  if (!match) return [];
  
  return match[1].split(',').map(p => {
    const trimmed = p.trim();
    const parts = trimmed.split(/\s*:\s*/);
    return {
      name: parts[0].replace(/[^\w]/g, ''),
      type: parts[1] || null,
      hasDefault: trimmed.includes('=')
    };
  }).filter(p => p.name);
}

// ============================================
// EXPORTS
// ============================================

export default {
  parseAST,
  findNodesByType,
  findFunctions,
  findClasses,
  findImports,
  findExports,
  findMethods,
  findArrowFunctions,
  PARSER_CONFIG
};

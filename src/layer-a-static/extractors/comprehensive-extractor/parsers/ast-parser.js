/**
 * @fileoverview ast-parser.js
 * 
 * AST Parser - Handles all AST operations for code extraction
 * Provides a unified interface for parsing and traversing code
 * 
 * @module comprehensive-extractor/parsers/ast-parser
 * @phase Layer A - Enhanced
 * 
 * @version 0.9.4 - Modularizado: separado en componentes especializados
 * @since 0.7.0
 */

import { createLogger } from '#utils/logger.js';
import { findFunctions, findArrowFunctions } from './functions/index.js';
import { findClasses, findMethods } from './classes/index.js';
import { findImports, findExports } from './modules/index.js';

const logger = createLogger('OmnySys:ast-parser');

export const PARSER_CONFIG = {
  ecmaVersion: 'latest',
  sourceType: 'module',
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

export function parseAST(code, options = {}) {
  try {
    const config = { ...PARSER_CONFIG, ...options };
    
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

export function findNodesByType(ast, nodeType) {
  if (!ast || !ast._raw) return [];
  
  const code = ast._raw;
  
  // Delegate to specialized parsers
  switch (nodeType) {
    case 'FunctionDeclaration':
      return findFunctions(code);
    case 'ArrowFunction':
      return findArrowFunctions(code);
    case 'ClassDeclaration':
      return findClasses(code);
    case 'ImportDeclaration':
      return findImports(code);
    case 'ExportDeclaration':
      return findExports(code);
    case 'MethodDefinition':
      // Would need class context
      return [];
    default:
      return [];
  }
}

export { findFunctions, findArrowFunctions, findClasses, findImports, findExports, findMethods };

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

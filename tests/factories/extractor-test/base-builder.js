/**
 * @fileoverview Base Builder - Configuración compartida
 * @module tests/factories/extractor-test/base-builder
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export const PARSER_CONFIG = {
  sourceType: 'module',
  plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
};

/**
 * Clase base con utilidades comunes para builders
 */
export class BaseBuilder {
  constructor() {
    this.code = '';
    this.filePath = 'test.js';
  }

  atFilePath(filePath) {
    this.filePath = filePath;
    return this;
  }

  withLine(code) {
    this.code += `${code}\n`;
    return this;
  }

  withBlankLine() {
    this.code += '\n';
    return this;
  }

  build() {
    return {
      code: this.code,
      filePath: this.filePath
    };
  }

  /**
   * Parse the code and return AST
   */
  buildAst() {
    return parse(this.code, PARSER_CONFIG);
  }

  /**
   * Parse and traverse the code, executing callback for each node type
   */
  traverse(visitors) {
    const ast = this.buildAst();
    traverse.default(ast, visitors);
    return ast;
  }

  /**
   * Find first node of a specific type
   */
  findNode(type) {
    let found = null;
    const ast = this.buildAst();
    traverse(ast, {
      [type](path) {
        if (!found) {
          found = path;
          path.stop();
        }
      }
    });
    return found;
  }
}

export default { PARSER_CONFIG, BaseBuilder };

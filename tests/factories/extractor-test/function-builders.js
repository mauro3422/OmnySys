/**
 * @fileoverview Function Builders - Builders especializados para funciones
 * @module tests/factories/extractor-test/function-builders
 */

import { BaseBuilder } from './base-builder.js';
import { CodeSampleBuilder } from './code-sample-builder.js';

/**
 * Builder for function declarations
 */
export class FunctionBuilder {
  constructor(name = 'testFunction') {
    this.name = name;
    this.params = [];
    this.body = 'return null;';
    this.options = {};
  }

  withName(name) {
    this.name = name;
    return this;
  }

  withParams(...params) {
    this.params = params;
    return this;
  }

  withBody(body) {
    this.body = body;
    return this;
  }

  isAsync() {
    this.options.async = true;
    return this;
  }

  isGenerator() {
    this.options.generator = true;
    return this;
  }

  isExported() {
    this.options.exported = true;
    return this;
  }

  withDestructuredParams(...patterns) {
    this.params = patterns;
    return this;
  }

  build() {
    const async = this.options.async ? 'async ' : '';
    const generator = this.options.generator ? '* ' : '';
    const exported = this.options.exported ? 'export ' : '';
    const paramStr = this.params.join(', ');
    return `${exported}${async}function${generator} ${this.name}(${paramStr}) {
  ${this.body}
}`;
  }

  buildCodeSample() {
    const builder = new CodeSampleBuilder();
    builder.code = this.build() + '\n';
    return builder;
  }

  buildAstNode() {
    const builder = this.buildCodeSample();
    return builder.findNode('FunctionDeclaration');
  }
}

/**
 * Builder for arrow functions
 */
export class ArrowFunctionBuilder {
  constructor(name = 'arrowFunc') {
    this.name = name;
    this.params = [];
    this.body = 'null';
    this.options = { block: false };
  }

  withName(name) {
    this.name = name;
    return this;
  }

  withParams(...params) {
    this.params = params;
    return this;
  }

  withBody(body) {
    this.body = body;
    return this;
  }

  withBlockBody(body) {
    this.body = body;
    this.options.block = true;
    return this;
  }

  isAsync() {
    this.options.async = true;
    return this;
  }

  isExported() {
    this.options.exported = true;
    return this;
  }

  build() {
    const paramStr = this.params.join(', ');
    const async = this.options.async ? 'async ' : '';
    const exported = this.options.exported ? 'export ' : '';
    
    if (this.options.block) {
      return `${exported}const ${this.name} = ${async}(${paramStr}) => {
  ${this.body}
};`;
    }
    return `${exported}const ${this.name} = ${async}(${paramStr}) => ${this.body};`;
  }

  buildCodeSample() {
    const builder = new CodeSampleBuilder();
    builder.code = this.build() + '\n';
    return builder;
  }

  buildAstNode() {
    const builder = this.buildCodeSample();
    return builder.findNode('ArrowFunctionExpression');
  }
}

export default { FunctionBuilder, ArrowFunctionBuilder };

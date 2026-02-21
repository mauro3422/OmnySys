/**
 * @fileoverview Class Builder - Builder especializado para clases
 * @module tests/factories/extractor-test/class-builder
 */

import { CodeSampleBuilder } from './code-sample-builder.js';

/**
 * Builder for classes with methods
 */
export class ClassBuilder {
  constructor(name = 'TestClass') {
    this.name = name;
    this.methods = [];
    this.options = {};
  }

  withName(name) {
    this.name = name;
    return this;
  }

  withMethod(name, params = [], options = {}) {
    this.methods.push({
      name,
      params,
      body: options.body || '',
      static: options.static || false,
      async: options.async || false,
      generator: options.generator || false,
      private: options.private || false,
      kind: 'method'
    });
    return this;
  }

  withStaticMethod(name, params = [], options = {}) {
    return this.withMethod(name, params, { ...options, static: true });
  }

  withAsyncMethod(name, params = [], options = {}) {
    return this.withMethod(name, params, { ...options, async: true });
  }

  withGeneratorMethod(name, params = [], options = {}) {
    return this.withMethod(name, params, { ...options, generator: true });
  }

  withPrivateMethod(name, params = [], options = {}) {
    // Strip leading # if provided, we'll add it back in build()
    const cleanName = name.startsWith('#') ? name.slice(1) : name;
    return this.withMethod(cleanName, params, { ...options, private: true });
  }

  withGetter(name, body = 'return this._value;') {
    this.methods.push({
      name,
      params: [],
      body,
      kind: 'get',
      static: false,
      async: false,
      generator: false,
      private: false
    });
    return this;
  }

  withSetter(name, body = 'this._value = value;') {
    this.methods.push({
      name,
      params: ['value'],
      body,
      kind: 'set',
      static: false,
      async: false,
      generator: false,
      private: false
    });
    return this;
  }

  withConstructor(params = [], body = '') {
    this.methods.unshift({
      name: 'constructor',
      params,
      body,
      kind: 'constructor',
      static: false,
      async: false,
      generator: false,
      private: false
    });
    return this;
  }

  isExported() {
    this.options.exported = true;
    return this;
  }

  build() {
    const exported = this.options.exported ? 'export ' : '';
    let code = `${exported}class ${this.name} {\n`;
    
    for (const method of this.methods) {
      const static_ = method.static ? 'static ' : '';
      const async = method.async ? 'async ' : '';
      const generator = method.generator ? '* ' : '';
      const private_ = method.private ? '#' : '';
      const params = method.params.join(', ');
      
      if (method.kind === 'get' || method.kind === 'set') {
        code += `  ${static_}${method.kind} ${method.name}(${params}) {\n    ${method.body}\n  }\n\n`;
      } else if (method.kind === 'constructor') {
        code += `  ${method.name}(${params}) {\n    ${method.body}\n  }\n\n`;
      } else {
        code += `  ${static_}${async}${generator}${private_}${method.name}(${params}) {\n    ${method.body}\n  }\n\n`;
      }
    }
    
    code += '}';
    return code;
  }

  buildCodeSample() {
    const builder = new CodeSampleBuilder();
    builder.code = this.build() + '\n';
    return builder;
  }

  buildAstNode() {
    const builder = this.buildCodeSample();
    return builder.findNode('ClassDeclaration');
  }
}

export default { ClassBuilder };

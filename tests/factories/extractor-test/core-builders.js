/**
 * @fileoverview Extractor Factory - Core Builders
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export const PARSER_CONFIG = {
  sourceType: 'module',
  plugins: ['jsx', 'typescript', 'classProperties', 'classPrivateMethods']
};

/**
 * Builder for creating code samples to test extractors
 */

export class CodeSampleBuilder {
  constructor() {
    this.code = '';
    this.filePath = 'test.js';
  }

  withFunction(name, params = [], body = 'return null;', options = {}) {
    const async = options.async ? 'async ' : '';
    const generator = options.generator ? '* ' : '';
    const exported = options.exported ? 'export ' : '';
    const paramStr = params.join(', ');
    this.code += `${exported}${async}function${generator} ${name}(${paramStr}) {
  ${body}
}

`;
    return this;
  }

  withArrow(name, params = [], body = 'null', options = {}) {
    const paramStr = params.join(', ');
    const blockBody = options.block ? `{
  return ${body};
}` : body;
    const exported = options.exported ? 'export ' : '';
    this.code += `${exported}const ${name} = (${paramStr}) => ${blockBody};

`;
    return this;
  }

  withClass(name, methods = [], options = {}) {
    const exported = options.exported ? 'export ' : '';
    this.code += `${exported}class ${name} {
`;
    for (const method of methods) {
      const static_ = method.static ? 'static ' : '';
      const async = method.async ? 'async ' : '';
      const generator = method.generator ? '* ' : '';
      const private_ = method.private ? '#' : '';
      const kind = method.kind || 'method';
      const params = method.params?.join(', ') || '';
      const body = method.body || '';
      
      if (kind === 'get' || kind === 'set') {
        this.code += `  ${static_}${kind} ${method.name}(${params}) {
    ${body}
  }

`;
      } else {
        this.code += `  ${static_}${async}${generator}${private_}${method.name}(${params}) {
    ${body}
  }

`;
      }
    }
    this.code += `}\n\n`;
    return this;
  }

  withImport(source, specifiers = [], isDefault = false) {
    if (isDefault && specifiers.length > 0) {
      this.code += `import ${specifiers[0]} from '${source}';
`;
    } else if (specifiers.length > 0) {
      this.code += `import { ${specifiers.join(', ')} } from '${source}';
`;
    } else {
      this.code += `import '${source}';
`;
    }
    return this;
  }

  withExport(name, isDefault = false) {
    if (isDefault) {
      this.code += `export default ${name};
`;
    } else {
      this.code += `export { ${name} };
`;
    }
    return this;
  }

  withWebSocket(url) {
    this.code += `const ws = new WebSocket('${url}');
`;
    return this;
  }

  withFetch(url) {
    this.code += `fetch('${url}').then(r => r.json());
`;
    return this;
  }

  withWorker(path) {
    this.code += `const worker = new Worker('${path}');
`;
    return this;
  }

  withRedux(sliceName) {
    this.code += `
import { createSlice } from '@reduxjs/toolkit';
const ${sliceName}Slice = createSlice({
  name: '${sliceName}',
  initialState: {},
  reducers: {}
});
`;
    return this;
  }

  withLocalStorage(key, value) {
    this.code += `localStorage.setItem('${key}', '${value}');
`;
    return this;
  }

  withEventListener(event, handler) {
    this.code += `document.addEventListener('${event}', ${handler});
`;
    return this;
  }

  withGlobalAccess(prop) {
    this.code += `window.${prop} = 'value';
`;
    return this;
  }

  withFunctionExpression(name, params = [], body = 'return null;', options = {}) {
    const async = options.async ? 'async ' : '';
    const generator = options.generator ? '* ' : '';
    const exported = options.exported ? 'export ' : '';
    const paramStr = params.join(', ');
    this.code += `${exported}const ${name} = ${async}function${generator}(${paramStr}) {
  ${body}
};

`;
    return this;
  }

  withDefaultExportFunction(name, params = [], body = 'return null;') {
    const paramStr = params.join(', ');
    this.code += `export default function ${name}(${paramStr}) {
  ${body}
}

`;
    return this;
  }

  withGetterSetter(className, propName, getterBody = 'return this._value;', setterBody = 'this._value = value;') {
    this.code += `class ${className} {
  get ${propName}() {
    ${getterBody}
  }

  set ${propName}(value) {
    ${setterBody}
  }
}

`;
    return this;
  }

  withConstructor(params = [], body = '') {
    const paramStr = params.join(', ');
    this.code += `  constructor(${paramStr}) {
    ${body}
  }

`;
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

  atFilePath(filePath) {
    this.filePath = filePath;
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

/**
 * Factory for creating common extraction scenarios
 */
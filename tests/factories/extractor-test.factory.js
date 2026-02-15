/**
 * @fileoverview Extractor Test Factory
 * 
 * Factory for creating test data and mock objects for extractor testing.
 * Provides builders for code samples, extraction results, and validation helpers.
 * 
 * EXTENDED FOR ATOMIC EXTRACTORS with Factory + Contracts pattern
 * 
 * @module tests/factories/extractor-test
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Parser configuration for all tests
 */
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
export class ExtractionScenarioFactory {
  static emptyFile() {
    return new CodeSampleBuilder().build();
  }

  static singleFunction(name = 'test') {
    return new CodeSampleBuilder()
      .withFunction(name, ['a', 'b'], 'return a + b;')
      .build();
  }

  static multipleFunctions(count = 3) {
    const builder = new CodeSampleBuilder();
    for (let i = 0; i < count; i++) {
      builder.withFunction(`func${i}`, [], `return ${i};`);
    }
    return builder.build();
  }

  static singleClass(name = 'MyClass', methodCount = 2) {
    const builder = new CodeSampleBuilder();
    const methods = [];
    for (let i = 0; i < methodCount; i++) {
      methods.push({ name: `method${i}`, params: [] });
    }
    builder.withClass(name, methods);
    return builder.build();
  }

  static importCycle(fileA, fileB) {
    return {
      [fileA]: new CodeSampleBuilder()
        .withImport(`./${fileB}`, ['exportedB'])
        .withExport('exportedA')
        .build(),
      [fileB]: new CodeSampleBuilder()
        .withImport(`./${fileA}`, ['exportedA'])
        .withExport('exportedB')
        .build()
    };
  }

  static webSocketClient() {
    return new CodeSampleBuilder()
      .withWebSocket('wss://api.example.com')
      .build();
  }

  static apiClient() {
    return new CodeSampleBuilder()
      .withFetch('/api/data')
      .withFunction('getUsers', [], 'return fetch("/api/users");')
      .build();
  }

  static reduxStore() {
    return new CodeSampleBuilder()
      .withRedux('user')
      .withRedux('cart')
      .build();
  }

  static webWorker() {
    return new CodeSampleBuilder()
      .withWorker('./worker.js')
      .build();
  }

  static localStorageUsage() {
    return new CodeSampleBuilder()
      .withLocalStorage('token', 'abc123')
      .withLocalStorage('user', '{}')
      .build();
  }

  static eventDriven() {
    return new CodeSampleBuilder()
      .withEventListener('click', 'handleClick')
      .withEventListener('submit', 'handleSubmit')
      .build();
  }

  static globalState() {
    return new CodeSampleBuilder()
      .withGlobalAccess('appState')
      .withGlobalAccess('config')
      .build();
  }

  // ATOMIC EXTRACTOR SCENARIOS

  static asyncFunction(name = 'fetchData') {
    return new CodeSampleBuilder()
      .withFunction(name, ['url'], 'return fetch(url);', { async: true })
      .build();
  }

  static generatorFunction(name = 'generate') {
    return new CodeSampleBuilder()
      .withFunction(name, [], 'yield 1; yield 2;', { generator: true })
      .build();
  }

  static arrowVariations() {
    const builder = new CodeSampleBuilder();
    builder.withArrow('simple', ['x'], 'x * 2');
    builder.withArrow('withBlock', ['x', 'y'], 'x + y', { block: true });
    builder.withArrow('asyncArrow', ['url'], 'fetch(url)', { async: true, block: true });
    return builder.build();
  }

  static classWithAllMethodTypes(className = 'TestClass') {
    const builder = new ClassBuilder(className)
      .withConstructor(['props'], 'this.props = props;')
      .withMethod('regular', ['a', 'b'], { body: 'return a + b;' })
      .withStaticMethod('staticMethod', [], { body: 'return "static";' })
      .withAsyncMethod('asyncMethod', ['url'], { body: 'return fetch(url);' })
      .withPrivateMethod('privateMethod', [], { body: 'return "private";' })
      .withGetter('value')
      .withSetter('value');
    
    return builder.buildCodeSample().build();
  }

  static exportedFunction(name = 'publicFn') {
    return new CodeSampleBuilder()
      .withFunction(name, [], 'return true;', { exported: true })
      .build();
  }

  static exportedArrow(name = 'publicArrow') {
    return new CodeSampleBuilder()
      .withArrow(name, ['x'], 'x * 2', { exported: true })
      .build();
  }

  static defaultExportFunction(name = 'defaultFn') {
    return new CodeSampleBuilder()
      .withDefaultExportFunction(name, ['opts'], 'return opts;')
      .build();
  }

  static complexFunction(name = 'complex') {
    return new CodeSampleBuilder()
      .withFunction(name, ['a', 'b', 'c'], `
  if (a > 0) {
    if (b > 0) {
      return a + b;
    }
  }
  for (let i = 0; i < c; i++) {
    console.log(i);
  }
  return c;
`)
      .build();
  }

  static functionWithFunctionExpression(name = 'outer') {
    return new CodeSampleBuilder()
      .withFunction(name, [], `const inner = function() { return 42; }; return inner();`)
      .build();
  }

  static invalidSyntax() {
    return {
      code: 'function { broken',
      filePath: 'invalid.js'
    };
  }

  static emptyFunction(name = 'empty') {
    return new CodeSampleBuilder()
      .withFunction(name, [], '')
      .build();
  }

  static functionWithManyParams(name = 'manyParams') {
    return new CodeSampleBuilder()
      .withFunction(name, ['a', 'b', 'c', 'd', 'e'], 'return a + b + c + d + e;')
      .build();
  }

  static functionWithDestructuring(name = 'destructure') {
    return new CodeSampleBuilder()
      .withFunction(name, ['{ x, y }', '[a, b]'], 'return x + y + a + b;')
      .build();
  }

  static nestedClasses(outerName = 'Outer', innerName = 'Inner') {
    return new CodeSampleBuilder()
      .withClass(outerName, [
        { name: 'outerMethod', params: [], body: `class ${innerName} { innerMethod() {} } return ${innerName};` }
 ])
      .build();
  }
}

/**
 * Validation helpers for extractor results
 */
export class ExtractionValidator {
  static isValidExtractionResult(result) {
    return result !== null && 
           result !== undefined && 
           typeof result === 'object';
  }

  static isValidArrayResult(result) {
    return Array.isArray(result);
  }

  static hasRequiredFields(obj, fields) {
    if (!obj || typeof obj !== 'object') return false;
    return fields.every(field => field in obj);
  }

  static validateAtom(atom) {
    return this.hasRequiredFields(atom, ['name', 'line', 'type']) &&
           typeof atom.name === 'string' &&
           typeof atom.line === 'number' &&
           typeof atom.type === 'string';
  }

  static validateFullAtom(atom) {
    const hasBasic = this.validateAtom(atom);
    const hasExtended = this.hasRequiredFields(atom, [
      'id', 'file', 'column', 'signature', 'dataFlow', 
      'calls', 'calledBy', 'visibility', 'exported', 'complexity'
    ]);
    return hasBasic && hasExtended;
  }

  static validateConnection(connection) {
    return this.hasRequiredFields(connection, ['source', 'target', 'type']) &&
           typeof connection.source === 'string' &&
           typeof connection.target === 'string' &&
           typeof connection.type === 'string';
  }

  static validateImport(imp) {
    return this.hasRequiredFields(imp, ['source', 'line']) &&
           typeof imp.source === 'string' &&
           typeof imp.line === 'number';
  }

  static validateExport(exp) {
    return this.hasRequiredFields(exp, ['name', 'line']) &&
           typeof exp.name === 'string' &&
           typeof exp.line === 'number';
  }

  static validateSignature(signature) {
    return this.hasRequiredFields(signature, ['params', 'returnType', 'async', 'generator']) &&
           Array.isArray(signature.params) &&
           typeof signature.async === 'boolean' &&
           typeof signature.generator === 'boolean';
  }

  static validateDataFlow(dataFlow) {
    return this.hasRequiredFields(dataFlow, ['inputs', 'transformations', 'outputs', 'sideEffects', 'lines']) &&
           Array.isArray(dataFlow.inputs) &&
           Array.isArray(dataFlow.outputs) &&
           Array.isArray(dataFlow.sideEffects);
  }
}

/**
 * Common test data constants
 */
export const TestConstants = {
  VALID_JS_FILE: 'test.js',
  VALID_TS_FILE: 'test.ts',
  VALID_JSX_FILE: 'test.jsx',
  INVALID_FILE: 'test.css',
  
  COMMON_PATTERNS: {
    FUNCTION: /function\s+\w+\s*\(/,
    ARROW: /const\s+\w+\s*=\s*\(/,
    CLASS: /class\s+\w+/,
    IMPORT: /import\s+.*from\s+['"]/,
    EXPORT: /export\s+(default\s+)?/
  },

  ATOM_TYPES: {
    FUNCTION: 'function',
    FUNCTION_EXPRESSION: 'function-expression',
    ARROW: 'arrow',
    METHOD: 'method',
    STATIC: 'static',
    PRIVATE_METHOD: 'private-method',
    GETTER: 'getter',
    SETTER: 'setter'
  }
};

/**
 * Contract definitions for atomic extractors
 */
export const AtomicExtractorContracts = {
  /**
   * All extractors must return an atom with these fields
   */
  REQUIRED_ATOM_FIELDS: [
    'id', 'name', 'type', 'file', 'line', 'column',
    'signature', 'dataFlow', 'calls', 'calledBy',
    'visibility', 'exported', 'complexity', 'lines',
    'analyzedAt'
  ],

  /**
   * Signature must have these fields
   */
  REQUIRED_SIGNATURE_FIELDS: ['params', 'returnType', 'async', 'generator'],

  /**
   * DataFlow must have these fields
   */
  REQUIRED_DATAFLOW_FIELDS: ['inputs', 'transformations', 'outputs', 'sideEffects', 'lines'],

  /**
   * Valid atom types
   */
  VALID_ATOM_TYPES: [
    'function', 'function-expression', 'arrow',
    'method', 'static', 'private-method', 'getter', 'setter'
  ]
};

/**
 * Communication-specific builder for WebSocket, Web Workers, etc.
 */
export class CommunicationBuilder {
  constructor() {
    this.code = '';
    this.filePath = 'test.js';
  }

  // WebSocket patterns
  withWebSocketFull(url, events = {}) {
    this.code += `const ws = new WebSocket('${url}');
`;
    if (events.onopen) {
      this.code += `ws.onopen = ${events.onopen};
`;
    }
    if (events.onmessage) {
      this.code += `ws.onmessage = ${events.onmessage};
`;
    }
    if (events.onclose) {
      this.code += `ws.onclose = ${events.onclose};
`;
    }
    if (events.onerror) {
      this.code += `ws.onerror = ${events.onerror};
`;
    }
    this.code += '\n';
    return this;
  }

  withWebSocketSecure(url) {
    this.code += `const wss = new WebSocket('${url}');
`;
    return this;
  }

  // Network patterns
  withFetch(url, options = {}) {
    const method = options.method || 'GET';
    if (options.body) {
      this.code += `fetch('${url}', { method: '${method}', body: ${options.body} });
`;
    } else {
      this.code += `fetch('${url}');
`;
    }
    return this;
  }

  withAxios(method, url) {
    this.code += `axios.${method}('${url}');
`;
    return this;
  }

  withXHR(method, url) {
    this.code += `const xhr = new XMLHttpRequest();
xhr.open('${method}', '${url}');
xhr.send();
`;
    return this;
  }

  // Web Workers
  withWorker(workerPath, messageHandler = null) {
    this.code += `const worker = new Worker('${workerPath}');
`;
    if (messageHandler) {
      this.code += `worker.onmessage = ${messageHandler};
`;
    }
    return this;
  }

  withWorkerPostMessage(message) {
    this.code += `worker.postMessage(${message});
`;
    return this;
  }

  withSharedWorker(workerPath) {
    this.code += `const sharedWorker = new SharedWorker('${workerPath}');
`;
    return this;
  }

  withSelfPostMessage() {
    this.code += `self.postMessage({ result: data });
`;
    return this;
  }

  withOnMessage(handler) {
    this.code += `self.onmessage = ${handler};
`;
    return this;
  }

  withAddEventListenerMessage() {
    this.code += `self.addEventListener('message', handleMessage);
`;
    return this;
  }

  // BroadcastChannel
  withBroadcastChannel(channelName) {
    this.code += `const bc = new BroadcastChannel('${channelName}');
`;
    return this;
  }

  withBroadcastChannelPostMessage(message) {
    this.code += `bc.postMessage(${message});
`;
    return this;
  }

  withBroadcastChannelOnMessage(handler) {
    this.code += `bc.onmessage = ${handler};
`;
    return this;
  }

  // MessageChannel
  withMessageChannel() {
    this.code += `const { port1, port2 } = new MessageChannel();
`;
    return this;
  }

  withMessagePortPostMessage(port, message) {
    this.code += `${port}.postMessage(${message});
`;
    return this;
  }

  withMessagePortOnMessage(port, handler) {
    this.code += `${port}.onmessage = ${handler};
`;
    return this;
  }

  // Server-Sent Events
  withEventSource(url) {
    this.code += `const es = new EventSource('${url}');
`;
    return this;
  }

  withEventSourceListener(event, handler) {
    this.code += `es.addEventListener('${event}', ${handler});
`;
    return this;
  }

  // Window PostMessage
  withWindowPostMessage(target, message) {
    this.code += `${target}.postMessage(${message});
`;
    return this;
  }

  withWindowOnMessage(handler) {
    this.code += `window.onmessage = ${handler};
`;
    return this;
  }

  withWindowAddEventListenerMessage(handler) {
    this.code += `window.addEventListener('message', ${handler});
`;
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
}

/**
 * Communication-specific test scenarios
 */
export class CommunicationScenarioFactory {
  static webSocketConnection(url = 'wss://api.example.com/socket') {
    return new CommunicationBuilder()
      .withWebSocketFull(url, {
        onopen: 'function() { console.log("open"); }',
        onmessage: 'function(e) { console.log(e.data); }',
        onclose: 'function() { console.log("close"); }',
        onerror: 'function(e) { console.error(e); }'
      })
      .build();
  }

  static webSocketMinimal(url = 'ws://localhost:8080') {
    return new CodeSampleBuilder()
      .withWebSocket(url)
      .build();
  }

  static fetchApiCall(url = '/api/users') {
    return new CommunicationBuilder()
      .withFetch(url)
      .build();
  }

  static axiosApiCall(method = 'get', url = '/api/data') {
    return new CommunicationBuilder()
      .withAxios(method, url)
      .build();
  }

  static xhrCall(method = 'POST', url = '/api/submit') {
    return new CommunicationBuilder()
      .withXHR(method, url)
      .build();
  }

  static dedicatedWorker(workerPath = './worker.js') {
    return new CommunicationBuilder()
      .withWorker(workerPath, 'handleWorkerMessage')
      .build();
  }

  static workerWithPostMessage(workerPath = './calc.worker.js') {
    return new CommunicationBuilder()
      .withWorker(workerPath)
      .withWorkerPostMessage('{ data: 123 }')
      .build();
  }

  static sharedWorker(workerPath = './shared-worker.js') {
    return new CommunicationBuilder()
      .withSharedWorker(workerPath)
      .build();
  }

  static workerCode() {
    return new CommunicationBuilder()
      .withOnMessage('function(e) { process(e.data); }')
      .withSelfPostMessage()
      .build();
  }

  static broadcastChannel(channelName = 'app-channel') {
    return new CommunicationBuilder()
      .withBroadcastChannel(channelName)
      .build();
  }

  static broadcastChannelFull(channelName = 'my-channel') {
    return new CommunicationBuilder()
      .withBroadcastChannel(channelName)
      .withBroadcastChannelPostMessage('{ type: "update" }')
      .withBroadcastChannelOnMessage('handleBroadcast')
      .build();
  }

  static messageChannel() {
    return new CommunicationBuilder()
      .withMessageChannel()
      .build();
  }

  static messageChannelWithPorts() {
    return new CommunicationBuilder()
      .withMessageChannel()
      .withMessagePortPostMessage('port1', '{ data: "hello" }')
      .withMessagePortOnMessage('port2', 'handleResponse')
      .build();
  }

  static eventSource(url = '/events/stream') {
    return new CommunicationBuilder()
      .withEventSource(url)
      .build();
  }

  static eventSourceWithListeners(url = '/sse/updates') {
    return new CommunicationBuilder()
      .withEventSource(url)
      .withEventSourceListener('update', 'onUpdate')
      .withEventSourceListener('error', 'onError')
      .build();
  }

  static windowPostMessageToParent() {
    return new CommunicationBuilder()
      .withWindowPostMessage('window.parent', '{ data: "hello" }')
      .build();
  }

  static windowPostMessageToOpener() {
    return new CommunicationBuilder()
      .withWindowPostMessage('window.opener', '{ data: "init" }')
      .build();
  }

  static windowPostMessageIncoming() {
    return new CommunicationBuilder()
      .withWindowAddEventListenerMessage('receiveMessage')
      .withWindowOnMessage('handleMessage')
      .build();
  }

  static complexCommunication() {
    // Multiple communication patterns in one file
    return new CommunicationBuilder()
      .withWebSocketFull('wss://ws.example.com', { onmessage: 'handler' })
      .withFetch('/api/data')
      .withBroadcastChannel('sync-channel')
      .build();
  }

  static emptyCode() {
    return { code: '', filePath: 'empty.js' };
  }

  static codeWithoutCommunication() {
    return new CodeSampleBuilder()
      .withFunction('regularFunction', ['a', 'b'], 'return a + b;')
      .build();
  }
}

/**
 * Communication-specific constants
 */
export const CommunicationConstants = {
  COMMUNICATION_TYPES: {
    WEBSOCKET: 'websocket_url',
    WEBSOCKET_EVENT: 'websocket_event',
    NETWORK_FETCH: 'network_fetch',
    NETWORK_XHR: 'network_xhr',
    NETWORK_AXIOS: 'network_axios',
    WORKER_CREATION: 'worker_creation',
    WORKER_POSTMESSAGE: 'worker_postMessage',
    WORKER_ONMESSAGE: 'worker_onmessage',
    SHAREDWORKER_CREATION: 'sharedworker_creation',
    BROADCAST_CHANNEL: 'broadcastChannel',
    MESSAGECHANNEL_CREATION: 'messageChannel_creation',
    MESSAGECHANNEL_PORT: 'messageChannel_port_usage',
    EVENTSOURCE_URL: 'eventsource_url',
    EVENTSOURCE_EVENT: 'eventsource_event',
    WINDOW_POSTMESSAGE_OUTGOING: 'window_postmessage_outgoing',
    WINDOW_POSTMESSAGE_LISTENER: 'window_postmessage_listener',
    WINDOW_ONMESSAGE: 'window_onmessage'
  },

  WEBSOCKET_EVENTS: ['onopen', 'onmessage', 'onclose', 'onerror'],

  NETWORK_METHODS: {
    FETCH: 'fetch',
    XHR: 'xhr',
    AXIOS: 'axios'
  },

  HTTP_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],

  WORKER_TYPES: {
    DEDICATED: 'Worker',
    SHARED: 'SharedWorker'
  }
};

/**
 * Contract definitions for communication extractors
 */
export const CommunicationExtractorContracts = {
  REQUIRED_WEBSOCKET_FIELDS: ['urls', 'events', 'all'],
  REQUIRED_NETWORK_FIELDS: ['urls', 'all'],
  REQUIRED_WORKER_FIELDS: ['incoming', 'outgoing', 'all'],
  REQUIRED_SHARED_WORKER_FIELDS: ['workers', 'all'],
  REQUIRED_BROADCAST_CHANNEL_FIELDS: ['channels', 'all'],
  REQUIRED_MESSAGE_CHANNEL_FIELDS: ['channels', 'all'],
  REQUIRED_SSE_FIELDS: ['urls', 'events', 'all'],
  REQUIRED_POSTMESSAGE_FIELDS: ['outgoing', 'incoming', 'all'],

  // All items in 'all' array must have these fields
  REQUIRED_ITEM_FIELDS: ['type', 'line'],

  // Specific fields for different types
  URL_FIELDS: ['url', 'line', 'type'],
  EVENT_FIELDS: ['event', 'line', 'type'],
  WORKER_FIELDS: ['workerPath', 'line', 'type'],
  CHANNEL_FIELDS: ['channel', 'line', 'type']
};

export default {
  CodeSampleBuilder,
  FunctionBuilder,
  ArrowFunctionBuilder,
  ClassBuilder,
  CommunicationBuilder,
  ExtractionScenarioFactory,
  CommunicationScenarioFactory,
  ExtractionValidator,
  TestConstants,
  CommunicationConstants,
  AtomicExtractorContracts,
  CommunicationExtractorContracts,
  PARSER_CONFIG
};

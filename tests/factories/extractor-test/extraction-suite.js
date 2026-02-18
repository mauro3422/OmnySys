/**
 * @fileoverview Extractor Factory - Extraction Scenarios and Validators
 */

import { CodeSampleBuilder, FunctionBuilder, ArrowFunctionBuilder, ClassBuilder } from './core-builders.js';

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
/**
 * @fileoverview Data Flow Test Factory
 * 
 * Provides builders for creating test scenarios for the Data Flow System.
 * 
 * @module tests/data-flow/__factories__/data-flow-test.factory
 */

import { parse } from '@babel/parser';

// Parser options consistent with the data-flow module
const PARSER_OPTIONS = {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
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
 * Parses code into AST
 * @param {string} code - Source code
 * @returns {Object} AST
 */
export function parseCode(code) {
  return parse(code, PARSER_OPTIONS);
}

/**
 * Builder for Data Flow scenarios
 */
export class DataFlowBuilder {
  constructor() {
    this.code = '';
    this.ast = null;
    this.inputs = [];
    this.transformations = [];
    this.outputs = [];
    this.graph = null;
  }

  /**
   * Sets the function code to analyze
   */
  withCode(code) {
    this.code = code;
    this.ast = parseCode(code);
    return this;
  }

  /**
   * Adds an input definition
   */
  withInput(name, type = 'simple', options = {}) {
    this.inputs.push({
      name,
      type,
      position: options.position ?? this.inputs.length,
      hasDefault: options.hasDefault ?? false,
      defaultValue: options.defaultValue,
      properties: options.properties,
      ...options
    });
    return this;
  }

  /**
   * Adds a destructured object input
   */
  withDestructuredObject(properties, options = {}) {
    const input = {
      name: `__destructured_${this.inputs.length}`,
      type: 'destructured-object',
      position: options.position ?? this.inputs.length,
      hasDefault: options.hasDefault ?? false,
      defaultValue: options.defaultValue,
      properties: properties.map(p => ({
        original: p.original || p.local,
        local: p.local,
        hasDefault: p.hasDefault ?? false
      }))
    };
    this.inputs.push(input);
    return this;
  }

  /**
   * Adds a destructured array input
   */
  withDestructuredArray(elements, options = {}) {
    const input = {
      name: `__destructured_${this.inputs.length}`,
      type: 'destructured-array',
      position: options.position ?? this.inputs.length,
      hasDefault: options.hasDefault ?? false,
      properties: elements.map((e, i) => ({
        index: i,
        local: e.local,
        hasDefault: e.hasDefault ?? false
      }))
    };
    this.inputs.push(input);
    return this;
  }

  /**
   * Adds a transformation
   */
  withTransformation(to, from, operation, options = {}) {
    this.transformations.push({
      to,
      from: Array.isArray(from) ? from : [from],
      operation,
      operationDetails: options.operationDetails || {},
      via: options.via,
      line: options.line,
      ...options
    });
    return this;
  }

  /**
   * Adds an output
   */
  withOutput(type, options = {}) {
    this.outputs.push({
      type,
      value: options.value,
      shape: options.shape,
      sources: options.sources || [],
      properties: options.properties,
      line: options.line,
      ...options
    });
    return this;
  }

  /**
   * Sets the graph
   */
  withGraph(graph) {
    this.graph = graph;
    return this;
  }

  /**
   * Builds the data flow scenario
   */
  build() {
    return {
      code: this.code,
      ast: this.ast,
      inputs: this.inputs,
      transformations: this.transformations,
      outputs: this.outputs,
      graph: this.graph
    };
  }

  /**
   * Creates a simple pure function scenario
   */
  static pureFunction() {
    return new DataFlowBuilder()
      .withCode('function add(a, b) { return a + b; }')
      .withInput('a')
      .withInput('b')
      .withTransformation('result', ['a', 'b'], 'binary_operation', { via: '+' })
      .withOutput('return', { value: 'a + b', sources: ['a', 'b'] });
  }

  /**
   * Creates a function with side effects
   */
  static withSideEffects() {
    return new DataFlowBuilder()
      .withCode('function logAndReturn(x) { console.log(x); return x; }')
      .withInput('x')
      .withOutput('side_effect', { target: 'console.log', operation: 'logging' })
      .withOutput('return', { value: 'x', sources: ['x'] });
  }

  /**
   * Creates an async function scenario
   */
  static asyncFunction() {
    return new DataFlowBuilder()
      .withCode('async function fetchData(url) { return await fetch(url); }')
      .withInput('url')
      .withTransformation('result', ['url'], 'await_function_call', { via: 'fetch' })
      .withOutput('return', { sources: ['url'] });
  }
}

/**
 * Builder for Input extraction scenarios
 */
export class InputBuilder {
  constructor() {
    this.code = '';
    this.params = [];
    this.expectedInputs = [];
    this.expectedUsages = new Map();
  }

  /**
   * Sets the function code
   */
  withFunction(code) {
    this.code = code;
    return this;
  }

  /**
   * Adds a simple parameter expectation
   */
  withSimpleParam(name, position, options = {}) {
    this.expectedInputs.push({
      name,
      position,
      type: 'simple',
      hasDefault: options.hasDefault ?? false,
      defaultValue: options.defaultValue,
      ...options
    });
    return this;
  }

  /**
   * Adds a rest parameter
   */
  withRestParam(name, position) {
    this.expectedInputs.push({
      name,
      position,
      type: 'rest',
      isRest: true,
      hasDefault: false
    });
    return this;
  }

  /**
   * Adds expected usages for an input
   */
  withUsages(inputName, usages) {
    this.expectedUsages.set(inputName, usages);
    return this;
  }

  /**
   * Builds the input scenario
   */
  build() {
    return {
      code: this.code,
      ast: this.code ? parseCode(this.code) : null,
      expectedInputs: this.expectedInputs,
      expectedUsages: this.expectedUsages
    };
  }

  // Factory methods for common input patterns
  static simpleFunction() {
    return new InputBuilder()
      .withFunction('function foo(a, b) { return a + b; }')
      .withSimpleParam('a', 0)
      .withSimpleParam('b', 1)
      .withUsages('a', [{ type: 'reference', line: 1 }]);
  }

  static withDefaults() {
    return new InputBuilder()
      .withFunction('function greet(name = "World") { return name; }')
      .withSimpleParam('name', 0, { hasDefault: true, defaultValue: { type: 'string', value: 'World' } });
  }

  static withDestructuring() {
    return new InputBuilder()
      .withFunction('function process({ id, name }) { return id + name; }')
      .withSimpleParam('__destructured_0', 0, {
        type: 'destructured-object',
        properties: [
          { original: 'id', local: 'id', hasDefault: false },
          { original: 'name', local: 'name', hasDefault: false }
        ]
      });
  }

  static withRest() {
    return new InputBuilder()
      .withFunction('function sum(...numbers) { return numbers.reduce((a, b) => a + b); }')
      .withRestParam('numbers', 0);
  }
}

/**
 * Builder for Output extraction scenarios
 */
export class OutputBuilder {
  constructor() {
    this.code = '';
    this.expectedOutputs = [];
    this.hasExplicitReturn = false;
    this.hasSideEffect = false;
  }

  /**
   * Sets the function code
   */
  withFunction(code) {
    this.code = code;
    return this;
  }

  /**
   * Adds an expected return output
   */
  withReturn(value, options = {}) {
    this.expectedOutputs.push({
      type: 'return',
      value,
      shape: options.shape || 'unknown',
      sources: options.sources || [],
      properties: options.properties,
      line: options.line,
      implicit: options.implicit || false
    });
    this.hasExplicitReturn = !options.implicit;
    return this;
  }

  /**
   * Adds an expected throw output
   */
  withThrow(errorType, message, options = {}) {
    this.expectedOutputs.push({
      type: 'throw',
      errorType,
      message,
      line: options.line
    });
    return this;
  }

  /**
   * Adds an expected side effect
   */
  withSideEffect(target, operation, options = {}) {
    this.expectedOutputs.push({
      type: 'side_effect',
      target,
      operation,
      sources: options.sources || [],
      isAsync: options.isAsync || false,
      line: options.line
    });
    this.hasSideEffect = true;
    return this;
  }

  /**
   * Builds the output scenario
   */
  build() {
    return {
      code: this.code,
      ast: this.code ? parseCode(this.code) : null,
      expectedOutputs: this.expectedOutputs,
      hasExplicitReturn: this.hasExplicitReturn,
      hasSideEffect: this.hasSideEffect
    };
  }

  // Factory methods
  static simpleReturn() {
    return new OutputBuilder()
      .withFunction('function identity(x) { return x; }')
      .withReturn('x', { shape: 'primitive', sources: ['x'] });
  }

  static objectReturn() {
    return new OutputBuilder()
      .withFunction('function makeObj(a, b) { return { a, b }; }')
      .withReturn('{ a, b }', { shape: 'object', sources: ['a', 'b'] });
  }

  static withLogging() {
    return new OutputBuilder()
      .withFunction('function log(x) { console.log(x); }')
      .withSideEffect('console.log', 'logging', { sources: ['x'] })
      .withReturn('undefined', { implicit: true });
  }

  static withThrow() {
    return new OutputBuilder()
      .withFunction('function validate(x) { if (!x) throw new Error("Invalid"); return x; }')
      .withThrow('Error', 'Invalid');
  }
}

/**
 * Builder for Transformation scenarios
 */
export class TransformationBuilder {
  constructor() {
    this.code = '';
    this.inputs = [];
    this.expectedTransformations = [];
  }

  /**
   * Sets the function code
   */
  withFunction(code) {
    this.code = code;
    return this;
  }

  /**
   * Sets the inputs
   */
  withInputs(inputs) {
    this.inputs = inputs;
    return this;
  }

  /**
   * Adds an expected transformation
   */
  withTransformation(to, from, operation, options = {}) {
    this.expectedTransformations.push({
      to,
      from: Array.isArray(from) ? from : [from],
      operation,
      operationDetails: options.operationDetails || {},
      via: options.via,
      line: options.line,
      ...options
    });
    return this;
  }

  /**
   * Adds a binary operation transformation
   */
  withBinaryOp(to, left, operator, right, line) {
    return this.withTransformation(to, [left, right], 'binary_operation', {
      via: operator,
      operationDetails: { operator },
      line
    });
  }

  /**
   * Adds a function call transformation
   */
  withFunctionCall(to, functionName, sources, line) {
    return this.withTransformation(to, sources, 'function_call', {
      via: functionName,
      operationDetails: { argumentCount: sources.length },
      line
    });
  }

  /**
   * Adds a property access transformation
   */
  withPropertyAccess(to, source, property, line) {
    return this.withTransformation(to, [source], 'property_access', {
      via: 'property_access',
      operationDetails: { path: `${source}.${property}` },
      line
    });
  }

  /**
   * Builds the transformation scenario
   */
  build() {
    return {
      code: this.code,
      ast: this.code ? parseCode(this.code) : null,
      inputs: this.inputs,
      expectedTransformations: this.expectedTransformations
    };
  }

  // Factory methods
  static simpleAssignment() {
    return new TransformationBuilder()
      .withFunction('function f(x) { const y = x; return y; }')
      .withInputs([{ name: 'x' }])
      .withTransformation('y', ['x'], 'assignment');
  }

  static binaryOperations() {
    return new TransformationBuilder()
      .withFunction('function calc(a, b) { const sum = a + b; const diff = a - b; return sum * diff; }')
      .withInputs([{ name: 'a' }, { name: 'b' }])
      .withBinaryOp('sum', 'a', '+', 'b', 1)
      .withBinaryOp('diff', 'a', '-', 'b', 1)
      .withBinaryOp('result', 'sum', '*', 'diff', 1);
  }

  static functionCalls() {
    return new TransformationBuilder()
      .withFunction('function process(x) { const y = parseInt(x); const z = Math.abs(y); return z; }')
      .withInputs([{ name: 'x' }])
      .withFunctionCall('y', 'parseInt', ['x'], 1)
      .withFunctionCall('z', 'Math.abs', ['y'], 1);
  }

  static propertyAccess() {
    return new TransformationBuilder()
      .withFunction('function getLength(arr) { const len = arr.length; return len; }')
      .withInputs([{ name: 'arr' }])
      .withPropertyAccess('len', 'arr', 'length', 1);
  }
}

/**
 * Builder for Type Inference scenarios
 */
export class TypeInferenceBuilder {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.expectedTypes = new Map();
    this.typeRules = [];
  }

  /**
   * Adds a node with known type
   */
  withTypedNode(id, type, options = {}) {
    this.nodes.push({
      id,
      type: options.nodeType || 'INPUT',
      category: options.category || 'input',
      output: options.output,
      inputs: options.inputs || [],
      properties: { type, ...options.properties }
    });
    this.expectedTypes.set(id, type);
    return this;
  }

  /**
   * Adds a node to be inferred
   */
  withNodeToInfer(id, nodeType, inputs, options = {}) {
    this.nodes.push({
      id,
      type: nodeType,
      category: options.category || 'transformation',
      inputs,
      output: options.output,
      properties: options.properties || {}
    });
    return this;
  }

  /**
   * Sets expected type for a node
   */
  expectType(nodeId, type) {
    this.expectedTypes.set(nodeId, type);
    return this;
  }

  /**
   * Adds an edge
   */
  withEdge(from, to, metadata = {}) {
    this.edges.push({ from, to, ...metadata });
    return this;
  }

  /**
   * Builds the type inference scenario
   */
  build() {
    return {
      graph: {
        nodes: this.nodes,
        edges: this.edges,
        meta: {
          totalNodes: this.nodes.length,
          totalEdges: this.edges.length
        }
      },
      expectedTypes: this.expectedTypes
    };
  }

  // Factory methods
  static numberPropagation() {
    return new TypeInferenceBuilder()
      .withTypedNode('input_001', 'number', { output: { name: 'x' } })
      .withNodeToInfer('binary_001', 'BINARY_OPERATION', [{ name: 'x', sourceType: 'variable' }])
      .withEdge('input_001', 'binary_001')
      .expectType('binary_001', 'number');
  }

  static stringConcatenation() {
    return new TypeInferenceBuilder()
      .withTypedNode('input_001', 'string', { output: { name: 'a' } })
      .withTypedNode('input_002', 'string', { output: { name: 'b' } })
      .withNodeToInfer('binary_001', 'BINARY_OPERATION', [
        { name: 'a', sourceType: 'variable' },
        { name: 'b', sourceType: 'variable' }
      ], { properties: { operator: '+' } })
      .withEdge('input_001', 'binary_001')
      .withEdge('input_002', 'binary_001')
      .expectType('binary_001', 'string');
  }

  static arrayMapping() {
    return new TypeInferenceBuilder()
      .withTypedNode('input_001', 'array', { output: { name: 'arr' } })
      .withNodeToInfer('call_001', 'CALL_EXPRESSION', [{ name: 'arr', sourceType: 'variable' }])
      .withEdge('input_001', 'call_001')
      .expectType('call_001', 'array');
  }
}

/**
 * Test fixtures for common patterns
 */
export const TestFixtures = {
  // Simple functions
  SIMPLE_ADD: 'function add(a, b) { return a + b; }',
  SIMPLE_IDENTITY: 'function identity(x) { return x; }',
  SIMPLE_NOOP: 'function noop() { }',

  // With defaults
  WITH_DEFAULTS: 'function greet(name = "World") { return `Hello, ${name}!`; }',
  WITH_MULTIPLE_DEFAULTS: 'function config(a = 1, b = 2, c = 3) { return a + b + c; }',

  // Destructuring
  DESTRUCTURED_OBJECT: 'function process({ id, name, email }) { return { id, displayName: name }; }',
  DESTRUCTURED_ARRAY: 'function first([a, b, c]) { return a; }',
  DESTRUCTURED_NESTED: 'function nested({ user: { name } }) { return name; }',
  DESTRUCTURED_WITH_DEFAULTS: 'function withDefaults({ x = 1, y = 2 } = {}) { return x + y; }',

  // Rest parameters
  REST_PARAMS: 'function sum(...numbers) { return numbers.reduce((a, b) => a + b, 0); }',
  REST_WITH_REGULAR: 'function mix(first, ...rest) { return [first, ...rest]; }',

  // Returns
  IMPLICIT_RETURN: 'const double = x => x * 2;',
  MULTIPLE_RETURNS: 'function abs(x) { if (x < 0) return -x; return x; }',
  EARLY_RETURN: 'function validate(x) { if (!x) return null; return process(x); }',
  OBJECT_RETURN: 'function makePerson(name, age) { return { name, age }; }',
  ARRAY_RETURN: 'function range(n) { return Array.from({ length: n }, (_, i) => i); }',

  // Side effects
  CONSOLE_LOG: 'function log(x) { console.log(x); }',
  LOCAL_STORAGE: 'function save(key, value) { localStorage.setItem(key, value); }',
  FETCH_CALL: 'async function fetchData(url) { const res = await fetch(url); return res.json(); }',
  ARRAY_MUTATION: 'function addItem(arr, item) { arr.push(item); return arr; }',
  DOM_MANIPULATION: 'function setText(el, text) { el.textContent = text; }',

  // Transformations
  BINARY_OPS: 'function calc(a, b) { const sum = a + b; const prod = a * b; return sum / prod; }',
  UNARY_OPS: 'function negate(x) { const neg = -x; return neg; }',
  PROPERTY_ACCESS: 'function getName(obj) { return obj.name; }',
  ARRAY_METHODS: 'function process(arr) { const mapped = arr.map(x => x * 2); const filtered = mapped.filter(x => x > 5); return filtered; }',
  CHAINED_CALLS: 'function chain(str) { return str.trim().toLowerCase().split(" "); }',
  DESTRUCTURING_ASSIGN: 'function split(point) { const { x, y } = point; return [x, y]; }',
  SPREAD_OPERATOR: 'function merge(a, b) { return { ...a, ...b }; }',

  // Complex flows
  ASYNC_FLOW: `
    async function processUser(userId) {
      const user = await fetchUser(userId);
      const posts = await fetchPosts(user.id);
      return { user, posts };
    }
  `,
  ERROR_HANDLING: `
    function safeDivide(a, b) {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    }
  `,
  TRY_CATCH: `
    function tryParse(json) {
      try {
        return JSON.parse(json);
      } catch (e) {
        return null;
      }
    }
  `,
  LOOP_PROCESSING: `
    function sumArray(arr) {
      let sum = 0;
      for (const item of arr) {
        sum += item;
      }
      return sum;
    }
  `,
  REDUCE_PATTERN: `
    function groupBy(arr, key) {
      return arr.reduce((acc, item) => {
        const k = item[key];
        acc[k] = acc[k] || [];
        acc[k].push(item);
        return acc;
      }, {});
    }
  `,

  // Type patterns
  TYPE_NUMBER_OPS: 'function numbers(a, b) { return (a + b) * (a - b); }',
  TYPE_STRING_OPS: 'function strings(a, b) { return a + b + a.toUpperCase(); }',
  TYPE_BOOLEAN_OPS: 'function bools(a, b) { return a && b || !a; }',
  TYPE_ARRAY_OPS: 'function arrays(a, b) { return [...a, ...b].map(x => x * 2); }',
  TYPE_OBJECT_OPS: 'function objects(a, b) { return { ...a, ...b, c: 1 }; }'
};

/**
 * Helper to create a mock graph
 */
export function createMockGraph(options = {}) {
  const nodes = options.nodes || [];
  const edges = options.edges || [];

  return {
    nodes,
    edges,
    meta: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      entryPoints: options.entryPoints || [],
      exitPoints: options.exitPoints || [],
      hasSideEffects: options.hasSideEffects || false,
      hasAsync: options.hasAsync || false,
      complexity: options.complexity || 0
    }
  };
}

/**
 * Helper to create a mock node
 */
export function createMockNode(id, type, options = {}) {
  return {
    id,
    type,
    category: options.category || 'transformation',
    inputs: options.inputs || [],
    output: options.output || null,
    properties: options.properties || {},
    location: options.location || null,
    ...options.metadata
  };
}

/**
 * Assertion helpers
 */
export const Assertions = {
  /**
   * Asserts that two arrays of inputs match
   */
  expectInputsMatch(actual, expected) {
    expect(actual).toHaveLength(expected.length);
    
    for (let i = 0; i < expected.length; i++) {
      expect(actual[i].name).toBe(expected[i].name);
      expect(actual[i].type).toBe(expected[i].type);
      expect(actual[i].position).toBe(expected[i].position);
    }
  },

  /**
   * Asserts that two arrays of transformations match
   */
  expectTransformationsMatch(actual, expected) {
    expect(actual).toHaveLength(expected.length);
    
    for (let i = 0; i < expected.length; i++) {
      expect(actual[i].to).toBe(expected[i].to);
      expect(actual[i].operation).toBe(expected[i].operation);
    }
  },

  /**
   * Asserts that two arrays of outputs match
   */
  expectOutputsMatch(actual, expected) {
    expect(actual).toHaveLength(expected.length);
    
    for (let i = 0; i < expected.length; i++) {
      expect(actual[i].type).toBe(expected[i].type);
      if (expected[i].value) {
        expect(actual[i].value).toBe(expected[i].value);
      }
    }
  }
};

// Default export
export default {
  DataFlowBuilder,
  InputBuilder,
  OutputBuilder,
  TransformationBuilder,
  TypeInferenceBuilder,
  TestFixtures,
  parseCode,
  createMockGraph,
  createMockNode,
  Assertions
};

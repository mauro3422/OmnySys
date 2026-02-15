/**
 * @fileoverview Data Flow Test Factory
 * 
 * Factory for creating test data and scenarios for Data Flow tests.
 * Provides builders for AST nodes, function structures, and test scenarios.
 * 
 * @module tests/factories/data-flow-test.factory
 */

import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// AST Node Builders
// ═══════════════════════════════════════════════════════════════════════════════

export class ASTNodeBuilder {
  static identifier(name, line = 1) {
    return {
      type: 'Identifier',
      name,
      loc: { start: { line }, end: { line } }
    };
  }

  static literal(value, line = 1) {
    return {
      type: 'Literal',
      value,
      raw: JSON.stringify(value),
      loc: { start: { line }, end: { line } }
    };
  }

  static returnStatement(argument, line = 1) {
    return {
      type: 'ReturnStatement',
      argument,
      loc: { start: { line }, end: { line } }
    };
  }

  static throwStatement(argument, line = 1) {
    return {
      type: 'ThrowStatement',
      argument,
      loc: { start: { line }, end: { line } }
    };
  }

  static expressionStatement(expression, line = 1) {
    return {
      type: 'ExpressionStatement',
      expression,
      loc: { start: { line }, end: { line } }
    };
  }

  static callExpression(callee, args = [], line = 1) {
    return {
      type: 'CallExpression',
      callee: typeof callee === 'string' ? this.identifier(callee) : callee,
      arguments: args,
      loc: { start: { line }, end: { line } }
    };
  }

  static memberExpression(object, property, computed = false, line = 1) {
    return {
      type: 'MemberExpression',
      object: typeof object === 'string' ? this.identifier(object) : object,
      property: typeof property === 'string' ? this.identifier(property) : property,
      computed,
      loc: { start: { line }, end: { line } }
    };
  }

  static binaryExpression(operator, left, right, line = 1) {
    return {
      type: 'BinaryExpression',
      operator,
      left: typeof left === 'string' ? this.identifier(left) : left,
      right: typeof right === 'string' ? this.identifier(right) : right,
      loc: { start: { line }, end: { line } }
    };
  }

  static assignmentExpression(left, right, operator = '=', line = 1) {
    return {
      type: 'AssignmentExpression',
      operator,
      left: typeof left === 'string' ? this.identifier(left) : left,
      right: typeof right === 'string' ? this.identifier(right) : right,
      loc: { start: { line }, end: { line } }
    };
  }

  static variableDeclaration(kind, declarations, line = 1) {
    return {
      type: 'VariableDeclaration',
      kind,
      declarations: declarations.map(d => ({
        type: 'VariableDeclarator',
        id: typeof d.id === 'string' ? this.identifier(d.id) : d.id,
        init: d.init ? (typeof d.init === 'string' ? this.identifier(d.init) : d.init) : null
      })),
      loc: { start: { line }, end: { line } }
    };
  }

  static functionDeclaration(name, params, body, line = 1) {
    return {
      type: 'FunctionDeclaration',
      id: name ? this.identifier(name) : null,
      params: params.map(p => typeof p === 'string' ? this.identifier(p) : p),
      body: body.type === 'BlockStatement' ? body : this.blockStatement(body),
      loc: { start: { line }, end: { line: line + 10 } }
    };
  }

  static arrowFunctionExpression(params, body, expression = false, line = 1) {
    return {
      type: 'ArrowFunctionExpression',
      params: params.map(p => typeof p === 'string' ? this.identifier(p) : p),
      body: expression ? body : (body.type === 'BlockStatement' ? body : this.blockStatement(body)),
      expression,
      loc: { start: { line }, end: { line: line + 5 } }
    };
  }

  static blockStatement(body = [], line = 1) {
    return {
      type: 'BlockStatement',
      body: Array.isArray(body) ? body : [body],
      loc: { start: { line }, end: { line: line + 10 } }
    };
  }

  static ifStatement(test, consequent, alternate = null, line = 1) {
    return {
      type: 'IfStatement',
      test: typeof test === 'string' ? this.identifier(test) : test,
      consequent: consequent.type === 'BlockStatement' ? consequent : this.blockStatement(consequent),
      alternate: alternate ? (alternate.type === 'BlockStatement' ? alternate : this.blockStatement(alternate)) : null,
      loc: { start: { line }, end: { line: line + 5 } }
    };
  }

  static tryStatement(block, handler = null, finalizer = null, line = 1) {
    return {
      type: 'TryStatement',
      block: block.type === 'BlockStatement' ? block : this.blockStatement(block),
      handler: handler ? {
        type: 'CatchClause',
        param: handler.param ? this.identifier(handler.param) : null,
        body: handler.body.type === 'BlockStatement' ? handler.body : this.blockStatement(handler.body)
      } : null,
      finalizer: finalizer ? (finalizer.type === 'BlockStatement' ? finalizer : this.blockStatement(finalizer)) : null,
      loc: { start: { line }, end: { line: line + 10 } }
    };
  }

  static objectExpression(properties = [], line = 1) {
    return {
      type: 'ObjectExpression',
      properties: properties.map(p => ({
        type: 'Property',
        key: typeof p.key === 'string' ? this.identifier(p.key) : p.key,
        value: typeof p.value === 'string' ? this.identifier(p.value) : p.value,
        kind: 'init'
      })),
      loc: { start: { line }, end: { line } }
    };
  }

  static arrayExpression(elements = [], line = 1) {
    return {
      type: 'ArrayExpression',
      elements: elements.map(e => typeof e === 'string' ? this.identifier(e) : e),
      loc: { start: { line }, end: { line } }
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Output Test Builder
// ═══════════════════════════════════════════════════════════════════════════════

export class OutputTestBuilder {
  constructor() {
    this.functionCode = '';
    this.transformations = [];
    this.ast = null;
  }

  withFunction(code) {
    this.functionCode = code;
    return this;
  }

  withSimpleReturn(value = 'x') {
    this.ast = ASTNodeBuilder.functionDeclaration('test', ['x'], [
      ASTNodeBuilder.returnStatement(ASTNodeBuilder.identifier(value), 2)
    ]);
    this.functionCode = `function test(x) { return ${value}; }`;
    return this;
  }

  withArrowReturn(expression) {
    this.ast = ASTNodeBuilder.arrowFunctionExpression(['x'], 
      typeof expression === 'string' ? ASTNodeBuilder.identifier(expression) : expression, 
      true
    );
    this.functionCode = `x => ${expression}`;
    return this;
  }

  withThrow(errorMessage) {
    this.ast = ASTNodeBuilder.functionDeclaration('test', [], [
      ASTNodeBuilder.throwStatement(ASTNodeBuilder.literal(errorMessage), 2)
    ]);
    return this;
  }

  withSideEffect(callName, args = []) {
    const callExpr = ASTNodeBuilder.callExpression(callName, args.map(a => 
      typeof a === 'string' ? ASTNodeBuilder.identifier(a) : a
    ));
    this.ast = ASTNodeBuilder.functionDeclaration('test', [], [
      ASTNodeBuilder.expressionStatement(callExpr, 2)
    ]);
    return this;
  }

  withNoReturn() {
    this.ast = ASTNodeBuilder.functionDeclaration('test', [], [
      ASTNodeBuilder.expressionStatement(ASTNodeBuilder.callExpression('console.log', [ASTNodeBuilder.literal('hello')]), 2)
    ]);
    return this;
  }

  withConditionalReturn() {
    this.ast = ASTNodeBuilder.functionDeclaration('test', ['x'], [
      ASTNodeBuilder.ifStatement(
        ASTNodeBuilder.identifier('x'),
        ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(1), 3),
        ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(0), 5),
        2
      )
    ]);
    return this;
  }

  withTryCatchReturn() {
    this.ast = ASTNodeBuilder.functionDeclaration('test', [], [
      ASTNodeBuilder.tryStatement(
        [ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal('success'), 3)],
        { param: 'e', body: [ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal('error'), 6)] },
        null,
        2
      )
    ]);
    return this;
  }

  build() {
    return {
      functionCode: this.functionCode,
      transformations: this.transformations,
      ast: this.ast
    };
  }

  buildAST() {
    return this.ast;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Transformation Test Builder
// ═══════════════════════════════════════════════════════════════════════════════

export class TransformationTestBuilder {
  constructor() {
    this.functionCode = '';
    this.inputs = [];
    this.ast = null;
  }

  withInput(name, type = 'param') {
    this.inputs.push({ name, type });
    return this;
  }

  withInputs(names) {
    names.forEach(n => this.withInput(n));
    return this;
  }

  withVariableAssignment(target, source) {
    this.ast = ASTNodeBuilder.functionDeclaration('test', this.inputs.map(i => i.name), [
      ASTNodeBuilder.variableDeclaration('const', [{ id: target, init: source }], 2)
    ]);
    return this;
  }

  withBinaryOperation(target, left, operator, right) {
    const binaryExpr = ASTNodeBuilder.binaryExpression(operator, left, right);
    this.ast = ASTNodeBuilder.functionDeclaration('test', [left], [
      ASTNodeBuilder.variableDeclaration('const', [{ id: target, init: binaryExpr }], 2)
    ]);
    return this;
  }

  withArrayMap(input, target = 'result') {
    const mapCall = ASTNodeBuilder.callExpression(
      ASTNodeBuilder.memberExpression(input, 'map'),
      [ASTNodeBuilder.arrowFunctionExpression(['x'], ASTNodeBuilder.binaryExpression('*', 'x', ASTNodeBuilder.literal(2)), true)]
    );
    this.ast = ASTNodeBuilder.functionDeclaration('test', [input], [
      ASTNodeBuilder.variableDeclaration('const', [{ id: target, init: mapCall }], 2)
    ]);
    return this;
  }

  withObjectDestructure(source, properties) {
    const destructured = {
      type: 'ObjectPattern',
      properties: properties.map(p => ({
        type: 'Property',
        key: ASTNodeBuilder.identifier(p),
        value: ASTNodeBuilder.identifier(p),
        kind: 'init'
      }))
    };
    this.ast = ASTNodeBuilder.functionDeclaration('test', [], [
      ASTNodeBuilder.variableDeclaration('const', [{ id: destructured, init: source }], 2)
    ]);
    return this;
  }

  withMutation(method, object, args = []) {
    const call = ASTNodeBuilder.callExpression(
      ASTNodeBuilder.memberExpression(object, method),
      args
    );
    this.ast = ASTNodeBuilder.functionDeclaration('test', [object], [
      ASTNodeBuilder.expressionStatement(call, 2)
    ]);
    return this;
  }

  build() {
    return {
      functionCode: this.functionCode,
      inputs: this.inputs,
      ast: this.ast
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type Inferrer Test Builder
// ═══════════════════════════════════════════════════════════════════════════════

export class TypeInferrerTestBuilder {
  constructor() {
    this.nodes = [];
    this.edges = [];
  }

  addNode(id, type = 'unknown', data = {}) {
    this.nodes.push({
      id,
      type: data.nodeType || 'variable',
      data: { inferredType: type, ...data }
    });
    return this;
  }

  addEdge(from, to, type = 'flow') {
    this.edges.push({ from, to, type });
    return this;
  }

  withNumberChain() {
    this.addNode('input', 'number')
        .addNode('add', 'number', { operation: 'add' })
        .addNode('result', 'number')
        .addEdge('input', 'add')
        .addEdge('add', 'result');
    return this;
  }

  withStringChain() {
    this.addNode('input', 'string')
        .addNode('concat', 'string', { operation: 'concat' })
        .addNode('result', 'string')
        .addEdge('input', 'concat')
        .addEdge('concat', 'result');
    return this;
  }

  withArrayChain() {
    this.addNode('input', 'array')
        .addNode('map', 'array', { operation: 'map' })
        .addNode('result', 'array')
        .addEdge('input', 'map')
        .addEdge('map', 'result');
    return this;
  }

  withObjectChain() {
    this.addNode('input', 'object')
        .addNode('transform', 'object', { operation: 'spread' })
        .addNode('result', 'object')
        .addEdge('input', 'transform')
        .addEdge('transform', 'result');
    return this;
  }

  withMixedTypes() {
    this.addNode('num1', 'number')
        .addNode('str1', 'string')
        .addNode('arr1', 'array')
        .addNode('obj1', 'object');
    return this;
  }

  buildGraph() {
    return {
      nodes: this.nodes,
      edges: this.edges
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Factories
// ═══════════════════════════════════════════════════════════════════════════════

export function createMockLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn()
  };
}

export function createMockOutputExtractor(outputs = []) {
  return {
    extract: vi.fn(() => outputs),
    hasReturn: outputs.some(o => o.type === 'return'),
    hasSideEffect: outputs.some(o => o.type === 'side_effect')
  };
}

export function createMockTransformationExtractor(transformations = []) {
  return {
    extract: vi.fn(() => transformations),
    getTransformations: vi.fn(() => transformations),
    getDefinedVariables: vi.fn(() => new Set()),
    isInput: vi.fn(() => false)
  };
}

export function createMockTypeRules() {
  return {
    infer: vi.fn((node) => node.data?.inferredType || 'unknown'),
    combine: vi.fn((t1, t2) => t1 === t2 ? t1 : 'mixed')
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════════════════════

export const DataFlowTestFixtures = {
  simpleFunction: `
    function add(a, b) {
      return a + b;
    }
  `,

  functionWithSideEffect: `
    function updateUser(user) {
      console.log('Updating user');
      user.updatedAt = Date.now();
      return user;
    }
  `,

  asyncFunction: `
    async function fetchData(url) {
      const response = await fetch(url);
      return response.json();
    }
  `,

  arrowFunction: `
    const double = x => x * 2;
  `,

  functionWithDestructuring: `
    function processUser({ name, age }) {
      return { name: name.toUpperCase(), age: age + 1 };
    }
  `,

  functionWithArrayMethods: `
    function processItems(items) {
      return items
        .filter(item => item.active)
        .map(item => item.value)
        .reduce((sum, val) => sum + val, 0);
    }
  `,

  functionWithTryCatch: `
    function safeParse(json) {
      try {
        return JSON.parse(json);
      } catch (e) {
        return null;
      }
    }
  `,

  functionWithMutation: `
    function addToList(list, item) {
      list.push(item);
      return list.length;
    }
  `
};

// ═══════════════════════════════════════════════════════════════════════════════
// Validation Helpers
// ═══════════════════════════════════════════════════════════════════════════════

export class DataFlowValidator {
  static isValidOutput(output) {
    return output &&
           typeof output === 'object' &&
           'type' in output &&
           ['return', 'throw', 'side_effect'].includes(output.type);
  }

  static isValidTransformation(transform) {
    return transform &&
           typeof transform === 'object' &&
           'to' in transform &&
           'from' in transform &&
           'operation' in transform;
  }

  static isValidTypeInference(inference) {
    return inference &&
           typeof inference === 'object' &&
           'nodeId' in inference &&
           'type' in inference;
  }

  static hasExpectedProperties(output, expectedProps) {
    if (!output || typeof output !== 'object') return false;
    return expectedProps.every(prop => prop in output);
  }
}

export default {
  ASTNodeBuilder,
  OutputTestBuilder,
  TransformationTestBuilder,
  TypeInferrerTestBuilder,
  createMockLogger,
  createMockOutputExtractor,
  createMockTransformationExtractor,
  createMockTypeRules,
  DataFlowTestFixtures,
  DataFlowValidator
};

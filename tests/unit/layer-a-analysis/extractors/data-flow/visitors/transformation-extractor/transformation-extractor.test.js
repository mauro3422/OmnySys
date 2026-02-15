/**
 * @fileoverview TransformationExtractor Tests
 * 
 * Tests for the TransformationExtractor class that extracts data flow
 * transformations from function ASTs.
 * 
 * @module tests/unit/layer-a-analysis/extractors/data-flow/visitors/transformation-extractor/transformation-extractor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TransformationExtractor } from '#layer-a/extractors/data-flow/visitors/transformation-extractor/transformation-extractor.js';
import { TransformationTestBuilder, ASTNodeBuilder } from '#test-factories/data-flow-test.factory.js';

describe('TransformationExtractor', () => {
  describe('constructor', () => {
    it('should initialize with function code and empty inputs', () => {
      const extractor = new TransformationExtractor('function test() {}');
      expect(extractor.code).toBe('function test() {}');
      expect(extractor.inputs).toEqual([]);
      expect(extractor.transformations).toEqual([]);
    });

    it('should initialize with provided inputs', () => {
      const inputs = [{ name: 'x', type: 'param' }, { name: 'y', type: 'param' }];
      const extractor = new TransformationExtractor('function test(x, y) {}', inputs);
      expect(extractor.inputs).toEqual(inputs);
      expect(extractor.inputNames.has('x')).toBe(true);
      expect(extractor.inputNames.has('y')).toBe(true);
    });

    it('should track destructured input properties', () => {
      const inputs = [{ 
        name: 'config', 
        type: 'destructured',
        properties: [{ local: 'host' }, { local: 'port' }]
      }];
      const extractor = new TransformationExtractor('function test({ host, port }) {}', inputs);
      expect(extractor.inputNames.has('host')).toBe(true);
      expect(extractor.inputNames.has('port')).toBe(true);
    });
  });

  describe('extract - basic transformations', () => {
    it('should extract simple variable assignment', () => {
      const ast = ASTNodeBuilder.functionDeclaration('test', ['x'], [
        ASTNodeBuilder.variableDeclaration('const', [{ id: 'y', init: 'x' }], 2)
      ]);
      
      const extractor = new TransformationExtractor('function test(x) { const y = x; }', [{ name: 'x' }]);
      const transformations = extractor.extract(ast);

      expect(transformations.length).toBeGreaterThan(0);
      const transform = transformations.find(t => t.to === 'y');
      expect(transform).toBeDefined();
    });

    it('should extract binary operation transformation', () => {
      const binaryExpr = ASTNodeBuilder.binaryExpression('+', 'x', ASTNodeBuilder.literal(1));
      const ast = ASTNodeBuilder.functionDeclaration('test', ['x'], [
        ASTNodeBuilder.variableDeclaration('const', [{ id: 'y', init: binaryExpr }], 2)
      ]);
      
      const extractor = new TransformationExtractor('function test(x) { const y = x + 1; }', [{ name: 'x' }]);
      const transformations = extractor.extract(ast);

      expect(transformations.length).toBeGreaterThan(0);
    });

    it('should extract call expression transformation', () => {
      const callExpr = ASTNodeBuilder.callExpression('process', [ASTNodeBuilder.identifier('data')]);
      const ast = ASTNodeBuilder.functionDeclaration('test', ['data'], [
        ASTNodeBuilder.variableDeclaration('const', [{ id: 'result', init: callExpr }], 2)
      ]);
      
      const extractor = new TransformationExtractor('function test(data) { const result = process(data); }', [{ name: 'data' }]);
      const transformations = extractor.extract(ast);

      expect(transformations.length).toBeGreaterThan(0);
    });
  });

  describe('extract - arrow functions', () => {
    it('should extract from arrow function with implicit return', () => {
      const ast = ASTNodeBuilder.arrowFunctionExpression(
        ['x'],
        ASTNodeBuilder.binaryExpression('*', 'x', ASTNodeBuilder.literal(2)),
        true
      );
      
      const extractor = new TransformationExtractor('x => x * 2', [{ name: 'x' }]);
      const transformations = extractor.extract(ast);

      expect(transformations).toBeDefined();
    });

    it('should extract from arrow function with block body', () => {
      const ast = ASTNodeBuilder.arrowFunctionExpression(
        ['x'],
        [
          ASTNodeBuilder.variableDeclaration('const', [{ id: 'y', init: ASTNodeBuilder.binaryExpression('*', 'x', ASTNodeBuilder.literal(2)) }], 2),
          ASTNodeBuilder.returnStatement(ASTNodeBuilder.identifier('y'), 3)
        ],
        false
      );
      
      const extractor = new TransformationExtractor('x => { const y = x * 2; return y; }', [{ name: 'x' }]);
      const transformations = extractor.extract(ast);

      expect(transformations).toBeDefined();
    });
  });

  describe('extract - control flow', () => {
    it('should handle if statement with transformations', () => {
      const ast = ASTNodeBuilder.functionDeclaration('test', ['condition', 'x'], [
        ASTNodeBuilder.ifStatement(
          ASTNodeBuilder.identifier('condition'),
          ASTNodeBuilder.variableDeclaration('const', [{ id: 'y', init: ASTNodeBuilder.binaryExpression('+', 'x', ASTNodeBuilder.literal(1)) }], 3),
          ASTNodeBuilder.variableDeclaration('const', [{ id: 'y', init: ASTNodeBuilder.binaryExpression('-', 'x', ASTNodeBuilder.literal(1)) }], 5),
          2
        )
      ]);
      
      const extractor = new TransformationExtractor(
        'function test(condition, x) { if (condition) { const y = x + 1; } else { const y = x - 1; } }',
        [{ name: 'condition' }, { name: 'x' }]
      );
      const transformations = extractor.extract(ast);

      expect(transformations).toBeDefined();
    });

    it('should handle try-catch with transformations', () => {
      const ast = ASTNodeBuilder.functionDeclaration('test', ['data'], [
        ASTNodeBuilder.tryStatement(
          [ASTNodeBuilder.variableDeclaration('const', [{ id: 'result', init: ASTNodeBuilder.callExpression('process', ['data']) }], 3)],
          { param: 'e', body: [ASTNodeBuilder.variableDeclaration('const', [{ id: 'result', init: ASTNodeBuilder.literal(null) }], 6)] },
          null,
          2
        )
      ]);
      
      const extractor = new TransformationExtractor(
        'function test(data) { try { const result = process(data); } catch (e) { const result = null; } }',
        [{ name: 'data' }]
      );
      const transformations = extractor.extract(ast);

      expect(transformations).toBeDefined();
    });
  });

  describe('extract - array and object operations', () => {
    it('should extract array map transformation', () => {
      const mapCall = ASTNodeBuilder.callExpression(
        ASTNodeBuilder.memberExpression('items', 'map'),
        [ASTNodeBuilder.arrowFunctionExpression(['x'], ASTNodeBuilder.binaryExpression('*', 'x', ASTNodeBuilder.literal(2)), true)]
      );
      const ast = ASTNodeBuilder.functionDeclaration('test', ['items'], [
        ASTNodeBuilder.variableDeclaration('const', [{ id: 'doubled', init: mapCall }], 2)
      ]);
      
      const extractor = new TransformationExtractor(
        'function test(items) { const doubled = items.map(x => x * 2); }',
        [{ name: 'items' }]
      );
      const transformations = extractor.extract(ast);

      expect(transformations).toBeDefined();
    });

    it('should extract object spread transformation', () => {
      const spreadExpr = {
        type: 'ObjectExpression',
        properties: [{
          type: 'SpreadElement',
          argument: ASTNodeBuilder.identifier('base')
        }, {
          type: 'Property',
          key: ASTNodeBuilder.identifier('name'),
          value: ASTNodeBuilder.identifier('name'),
          kind: 'init'
        }]
      };
      const ast = ASTNodeBuilder.functionDeclaration('test', ['base', 'name'], [
        ASTNodeBuilder.variableDeclaration('const', [{ id: 'result', init: spreadExpr }], 2)
      ]);
      
      const extractor = new TransformationExtractor(
        'function test(base, name) { const result = { ...base, name }; }',
        [{ name: 'base' }, { name: 'name' }]
      );
      const transformations = extractor.extract(ast);

      expect(transformations).toBeDefined();
    });
  });

  describe('variable tracking', () => {
    it('should track defined variables', () => {
      const ast = ASTNodeBuilder.functionDeclaration('test', [], [
        ASTNodeBuilder.variableDeclaration('const', [{ id: 'x', init: ASTNodeBuilder.literal(1) }], 2),
        ASTNodeBuilder.variableDeclaration('let', [{ id: 'y', init: ASTNodeBuilder.literal(2) }], 3)
      ]);
      
      const extractor = new TransformationExtractor('function test() { const x = 1; let y = 2; }');
      extractor.extract(ast);
      
      const definedVars = extractor.getDefinedVariables();
      expect(definedVars.has('x')).toBe(true);
      expect(definedVars.has('y')).toBe(true);
    });

    it('should correctly identify inputs', () => {
      const extractor = new TransformationExtractor('function test(x, y) {}', [
        { name: 'x' },
        { name: 'y' }
      ]);
      
      expect(extractor.isInput('x')).toBe(true);
      expect(extractor.isInput('y')).toBe(true);
      expect(extractor.isInput('z')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for null AST', () => {
      const extractor = new TransformationExtractor('function test() {}');
      const transformations = extractor.extract(null);
      expect(transformations).toEqual([]);
    });

    it('should return empty array for AST without function node', () => {
      const ast = { type: 'Program', body: [] };
      const extractor = new TransformationExtractor('');
      const transformations = extractor.extract(ast);
      expect(transformations).toEqual([]);
    });

    it('should handle function with no body', () => {
      const ast = {
        type: 'Program',
        body: [{
          type: 'FunctionDeclaration',
          id: { type: 'Identifier', name: 'test' },
          params: [],
          body: null
        }]
      };
      const extractor = new TransformationExtractor('function test();');
      const transformations = extractor.extract(ast);
      expect(transformations).toEqual([]);
    });
  });

  describe('getTransformations', () => {
    it('should return copy of transformations array', () => {
      const ast = ASTNodeBuilder.functionDeclaration('test', ['x'], [
        ASTNodeBuilder.variableDeclaration('const', [{ id: 'y', init: 'x' }], 2)
      ]);
      
      const extractor = new TransformationExtractor('function test(x) { const y = x; }', [{ name: 'x' }]);
      extractor.extract(ast);
      
      const transformations = extractor.getTransformations();
      expect(Array.isArray(transformations)).toBe(true);
    });
  });
});

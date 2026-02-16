/**
 * @fileoverview Return Extractor Tests
 * 
 * Tests for the return-extractor module that extracts return statement
 * information including value, shape, sources, and properties.
 * 
 * @module tests/unit/layer-a-analysis/extractors/data-flow/visitors/output-extractor/extractors/return-extractor
 */

import { describe, it, expect } from 'vitest';
import { extractReturn, extractImplicitReturn, createUndefinedReturn } from '#layer-a/extractors/data-flow/visitors/output-extractor/extractors/return-extractor.js';
import { ASTNodeBuilder } from '#test-factories/data-flow-test.factory.js';

describe('extractReturn', () => {
  it('should extract return with literal value', () => {
    const returnStmt = ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(42), 5);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(typeof result.value).toBe('string');
    expect(result.value.length).toBeGreaterThan(0);
    expect(result.line).toBe(5);
  });

  it('should extract return with identifier', () => {
    const returnStmt = ASTNodeBuilder.returnStatement(ASTNodeBuilder.identifier('userData'), 10);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(result.value).toBe('userData');
    expect(result.shape).toBeDefined();
  });

  it('should extract return with binary expression', () => {
    const binaryExpr = ASTNodeBuilder.binaryExpression('+', 'a', 'b');
    const returnStmt = ASTNodeBuilder.returnStatement(binaryExpr, 3);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(typeof result.value).toBe('string');
    expect(result.value).toContain('BinaryExpression');
  });

  it('should extract return with call expression', () => {
    const callExpr = ASTNodeBuilder.callExpression('processData', [ASTNodeBuilder.identifier('input')]);
    const returnStmt = ASTNodeBuilder.returnStatement(callExpr, 8);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(result.sources).toBeDefined();
    expect(Array.isArray(result.sources)).toBe(true);
  });

  it('should extract return with object expression', () => {
    const objExpr = ASTNodeBuilder.objectExpression([
      { key: 'id', value: ASTNodeBuilder.identifier('id') },
      { key: 'name', value: ASTNodeBuilder.identifier('name') }
    ]);
    const returnStmt = ASTNodeBuilder.returnStatement(objExpr, 15);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(typeof result.shape).toBe('string');
    expect(result.properties).toBeDefined();
    expect(Array.isArray(result.properties)).toBe(true);
  });

  it('should extract return with array expression', () => {
    const arrExpr = ASTNodeBuilder.arrayExpression(['item1', 'item2', 'item3']);
    const returnStmt = ASTNodeBuilder.returnStatement(arrExpr, 20);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(typeof result.shape).toBe('string');
  });

  it('should extract return with member expression', () => {
    const memberExpr = ASTNodeBuilder.memberExpression('user', 'name');
    const returnStmt = ASTNodeBuilder.returnStatement(memberExpr, 12);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(typeof result.value).toBe('string');
    expect(result.value).toContain('MemberExpression');
  });

  it('should handle return with undefined (no argument)', () => {
    const returnStmt = ASTNodeBuilder.returnStatement(null, 5);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(result.value).toBe('undefined');
    expect(result.shape).toBe('undefined');
  });

  it('should extract return with conditional expression', () => {
    const conditionalExpr = {
      type: 'ConditionalExpression',
      test: ASTNodeBuilder.identifier('isValid'),
      consequent: ASTNodeBuilder.literal('yes'),
      alternate: ASTNodeBuilder.literal('no'),
      loc: { start: { line: 1 }, end: { line: 1 } }
    };
    const returnStmt = ASTNodeBuilder.returnStatement(conditionalExpr, 7);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(typeof result.shape).toBe('string');
  });

  it('should extract return with logical expression', () => {
    const logicalExpr = {
      type: 'LogicalExpression',
      operator: '||',
      left: ASTNodeBuilder.identifier('value'),
      right: ASTNodeBuilder.literal('default'),
      loc: { start: { line: 1 }, end: { line: 1 } }
    };
    const returnStmt = ASTNodeBuilder.returnStatement(logicalExpr, 9);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
  });
});

describe('extractImplicitReturn', () => {
  it('should extract implicit return from arrow function', () => {
    const expr = ASTNodeBuilder.identifier('x');
    const result = extractImplicitReturn(expr);

    expect(result.type).toBe('return');
    expect(result.implicit).toBe(true);
    expect(result.value).toBe('x');
  });

  it('should extract implicit return with binary expression', () => {
    const expr = ASTNodeBuilder.binaryExpression('*', 'x', ASTNodeBuilder.literal(2));
    const result = extractImplicitReturn(expr);

    expect(result.type).toBe('return');
    expect(result.implicit).toBe(true);
    expect(result.sources).toBeDefined();
  });

  it('should extract implicit return with object literal', () => {
    const expr = ASTNodeBuilder.objectExpression([
      { key: 'id', value: ASTNodeBuilder.identifier('id') }
    ]);
    const result = extractImplicitReturn(expr);

    expect(result.type).toBe('return');
    expect(typeof result.shape).toBe('string');
    expect(result.properties).toBeDefined();
  });

  it('should extract implicit return with array literal', () => {
    const expr = ASTNodeBuilder.arrayExpression([ASTNodeBuilder.literal(1), ASTNodeBuilder.literal(2)]);
    const result = extractImplicitReturn(expr);

    expect(result.type).toBe('return');
    expect(typeof result.shape).toBe('string');
  });

  it('should handle call expression in implicit return', () => {
    const expr = ASTNodeBuilder.callExpression('transform', [ASTNodeBuilder.identifier('data')]);
    const result = extractImplicitReturn(expr);

    expect(result.type).toBe('return');
    expect(result.sources).toBeDefined();
  });
});

describe('createUndefinedReturn', () => {
  it('should create undefined return output', () => {
    const result = createUndefinedReturn(25);

    expect(result.type).toBe('return');
    expect(result.value).toBe('undefined');
    expect(result.shape).toBe('undefined');
    expect(result.implicit).toBe(true);
    expect(result.line).toBe(25);
  });

  it('should create undefined return with different line numbers', () => {
    const result1 = createUndefinedReturn(1);
    const result2 = createUndefinedReturn(100);
    const result3 = createUndefinedReturn(undefined);

    expect(result1.line).toBe(1);
    expect(result2.line).toBe(100);
    expect(result3.line).toBeUndefined();
  });

  it('should create valid output structure', () => {
    const result = createUndefinedReturn(10);

    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('shape');
    expect(result).toHaveProperty('implicit');
    expect(result).toHaveProperty('line');
  });
});

describe('return extraction - complex scenarios', () => {
  it('should handle nested object returns', () => {
    const nestedObj = ASTNodeBuilder.objectExpression([
      { 
        key: 'user', 
        value: ASTNodeBuilder.objectExpression([
          { key: 'name', value: ASTNodeBuilder.identifier('name') },
          { key: 'email', value: ASTNodeBuilder.identifier('email') }
        ])
      }
    ]);
    const returnStmt = ASTNodeBuilder.returnStatement(nestedObj, 5);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(typeof result.shape).toBe('string');
  });

  it('should handle function call chain returns', () => {
    const chainExpr = ASTNodeBuilder.callExpression(
      ASTNodeBuilder.memberExpression(
        ASTNodeBuilder.callExpression('getData', []),
        'map'
      ),
      [ASTNodeBuilder.identifier('transform')]
    );
    const returnStmt = ASTNodeBuilder.returnStatement(chainExpr, 10);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
    expect(result.sources).toBeDefined();
  });

  it('should handle returns with template literals', () => {
    const templateExpr = {
      type: 'TemplateLiteral',
      quasis: [{ type: 'TemplateElement', value: { raw: 'Hello ' } }],
      expressions: [ASTNodeBuilder.identifier('name')],
      loc: { start: { line: 1 }, end: { line: 1 } }
    };
    const returnStmt = ASTNodeBuilder.returnStatement(templateExpr, 8);
    const result = extractReturn(returnStmt);

    expect(result.type).toBe('return');
  });
});

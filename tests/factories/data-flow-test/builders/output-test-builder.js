/**
 * @fileoverview Output Test Builder
 * Builder for creating output test scenarios
 */

import { ASTNodeBuilder } from './ast-node-builder.js';

export class OutputTestBuilder {
  constructor() {
    this.functionCode = '';
    this.transformations = [];
    this.ast = null;
  }

  static create() {
    return new OutputTestBuilder();
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

  withChainedCalls(chain) {
    const parts = chain.split('.');
    let expr = ASTNodeBuilder.identifier(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      expr = ASTNodeBuilder.memberExpression(expr, parts[i]);
    }
    this.ast = ASTNodeBuilder.functionDeclaration('test', [], [
      ASTNodeBuilder.returnStatement(expr, 2)
    ]);
    return this;
  }

  withArrayMap() {
    this.ast = ASTNodeBuilder.functionDeclaration('test', ['arr'], [
      ASTNodeBuilder.returnStatement(
        ASTNodeBuilder.callExpression(
          ASTNodeBuilder.memberExpression('arr', 'map'),
          [ASTNodeBuilder.arrowFunctionExpression(['x'], ASTNodeBuilder.identifier('x'), true)]
        ),
        2
      )
    ]);
    return this;
  }

  withObjectDestructuring() {
    this.ast = ASTNodeBuilder.functionDeclaration('test', ['obj'], [
      ASTNodeBuilder.variableDeclaration('const', [{ id: '{ a, b }', init: 'obj' }], 2),
      ASTNodeBuilder.returnStatement(ASTNodeBuilder.identifier('a'), 3)
    ]);
    return this;
  }

  build() {
    return {
      code: this.functionCode,
      ast: this.ast,
      transformations: this.transformations
    };
  }
}

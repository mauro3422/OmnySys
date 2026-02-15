/**
 * @fileoverview Statement Processor Tests
 * 
 * Tests for the statement-processor module that handles different
 * AST statement types during output extraction.
 * 
 * @module tests/unit/layer-a-analysis/extractors/data-flow/visitors/output-extractor/processors/statement-processor
 */

import { describe, it, expect, vi } from 'vitest';
import { processStatements, processStatement } from '#layer-a/extractors/data-flow/visitors/output-extractor/processors/statement-processor.js';
import { ASTNodeBuilder } from '#test-factories/data-flow-test.factory.js';

describe('processStatements', () => {
  it('should process multiple statements in sequence', () => {
    const handlers = {
      onReturn: vi.fn(() => ({ type: 'return' }))
    };
    const state = { outputs: [], hasReturn: false };
    
    const statements = [
      ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(1)),
      ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(2))
    ];
    
    processStatements(statements, handlers, state);
    
    expect(handlers.onReturn).toHaveBeenCalledTimes(2);
    expect(state.outputs).toHaveLength(2);
  });

  it('should handle empty statements array', () => {
    const handlers = {};
    const state = { outputs: [] };
    
    processStatements([], handlers, state);
    
    expect(state.outputs).toEqual([]);
  });
});

describe('processStatement - ReturnStatement', () => {
  it('should call onReturn handler and set hasReturn flag', () => {
    const handlers = {
      onReturn: vi.fn((stmt) => ({ type: 'return', value: stmt.argument.value }))
    };
    const state = { outputs: [], hasReturn: false };
    
    const stmt = ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(42));
    processStatement(stmt, handlers, state);
    
    expect(handlers.onReturn).toHaveBeenCalledWith(stmt);
    expect(state.hasReturn).toBe(true);
    expect(state.outputs[0].value).toBe(42);
  });

  it('should handle return without argument', () => {
    const handlers = {
      onReturn: vi.fn(() => ({ type: 'return', value: 'undefined' }))
    };
    const state = { outputs: [], hasReturn: false };
    
    const stmt = ASTNodeBuilder.returnStatement(null);
    processStatement(stmt, handlers, state);
    
    expect(state.hasReturn).toBe(true);
  });

  it('should work without onReturn handler', () => {
    const handlers = {};
    const state = { outputs: [], hasReturn: false };
    
    const stmt = ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(42));
    processStatement(stmt, handlers, state);
    
    expect(state.hasReturn).toBe(true);
    expect(state.outputs).toEqual([]);
  });
});

describe('processStatement - ThrowStatement', () => {
  it('should call onThrow handler', () => {
    const handlers = {
      onThrow: vi.fn((stmt) => ({ type: 'throw', message: stmt.argument.value }))
    };
    const state = { outputs: [] };
    
    const stmt = ASTNodeBuilder.throwStatement(ASTNodeBuilder.literal('error'));
    processStatement(stmt, handlers, state);
    
    expect(handlers.onThrow).toHaveBeenCalledWith(stmt);
    expect(state.outputs[0].message).toBe('error');
  });

  it('should work without onThrow handler', () => {
    const handlers = {};
    const state = { outputs: [] };
    
    const stmt = ASTNodeBuilder.throwStatement(ASTNodeBuilder.literal('error'));
    processStatement(stmt, handlers, state);
    
    expect(state.outputs).toEqual([]);
  });
});

describe('processStatement - ExpressionStatement', () => {
  it('should call onSideEffect handler for expression statements', () => {
    const handlers = {
      onSideEffect: vi.fn((expr) => ({ type: 'side_effect', target: expr.callee?.name }))
    };
    const state = { outputs: [], hasSideEffect: false };
    
    const callExpr = ASTNodeBuilder.callExpression('console.log', [ASTNodeBuilder.literal('test')]);
    const stmt = ASTNodeBuilder.expressionStatement(callExpr);
    processStatement(stmt, handlers, state);
    
    expect(handlers.onSideEffect).toHaveBeenCalledWith(callExpr);
    expect(state.hasSideEffect).toBe(true);
  });

  it('should track hasSideEffect flag', () => {
    const handlers = {
      onSideEffect: vi.fn(() => ({ type: 'side_effect' }))
    };
    const state = { outputs: [], hasSideEffect: false };
    
    const stmt = ASTNodeBuilder.expressionStatement(ASTNodeBuilder.callExpression('foo'));
    processStatement(stmt, handlers, state);
    
    expect(state.hasSideEffect).toBe(true);
  });
});

describe('processStatement - IfStatement', () => {
  it('should process both consequent and alternate', () => {
    const handlers = {
      onReturn: vi.fn(() => ({ type: 'return' }))
    };
    const state = { outputs: [], hasReturn: false };
    
    const stmt = ASTNodeBuilder.ifStatement(
      ASTNodeBuilder.identifier('condition'),
      ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(1), 2),
      ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(0), 4),
      1
    );
    processStatement(stmt, handlers, state);
    
    expect(handlers.onReturn).toHaveBeenCalledTimes(2);
  });

  it('should handle if without else', () => {
    const handlers = {
      onReturn: vi.fn(() => ({ type: 'return' }))
    };
    const state = { outputs: [], hasReturn: false };
    
    const stmt = {
      type: 'IfStatement',
      test: ASTNodeBuilder.identifier('condition'),
      consequent: ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(1)),
      alternate: null
    };
    processStatement(stmt, handlers, state);
    
    expect(handlers.onReturn).toHaveBeenCalledTimes(1);
  });
});

describe('processStatement - TryStatement', () => {
  it('should process try, catch, and finally blocks', () => {
    const handlers = {
      onReturn: vi.fn(() => ({ type: 'return' }))
    };
    const state = { outputs: [], hasReturn: false };
    
    const stmt = ASTNodeBuilder.tryStatement(
      [ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal('try'), 2)],
      { param: 'e', body: [ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal('catch'), 4)] },
      [ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal('finally'), 6)],
      1
    );
    processStatement(stmt, handlers, state);
    
    expect(handlers.onReturn).toHaveBeenCalledTimes(3);
  });

  it('should handle try without finally', () => {
    const handlers = {
      onReturn: vi.fn(() => ({ type: 'return' }))
    };
    const state = { outputs: [] };
    
    const stmt = {
      type: 'TryStatement',
      block: ASTNodeBuilder.blockStatement([ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(1))]),
      handler: {
        type: 'CatchClause',
        param: ASTNodeBuilder.identifier('e'),
        body: ASTNodeBuilder.blockStatement([ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(2))])
      },
      finalizer: null
    };
    processStatement(stmt, handlers, state);
    
    expect(handlers.onReturn).toHaveBeenCalledTimes(2);
  });

  it('should handle try without catch', () => {
    const handlers = {};
    const state = { outputs: [] };
    
    const stmt = {
      type: 'TryStatement',
      block: ASTNodeBuilder.blockStatement([]),
      handler: null,
      finalizer: ASTNodeBuilder.blockStatement([])
    };
    
    expect(() => processStatement(stmt, handlers, state)).not.toThrow();
  });
});

describe('processStatement - SwitchStatement', () => {
  it('should process all cases', () => {
    const handlers = {
      onReturn: vi.fn(() => ({ type: 'return' }))
    };
    const state = { outputs: [] };
    
    const stmt = {
      type: 'SwitchStatement',
      discriminant: ASTNodeBuilder.identifier('x'),
      cases: [
        {
          type: 'SwitchCase',
          test: ASTNodeBuilder.literal('a'),
          consequent: [ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(1))]
        },
        {
          type: 'SwitchCase',
          test: ASTNodeBuilder.literal('b'),
          consequent: [ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(2))]
        }
      ]
    };
    processStatement(stmt, handlers, state);
    
    expect(handlers.onReturn).toHaveBeenCalledTimes(2);
  });

  it('should handle default case', () => {
    const handlers = {};
    const state = { outputs: [] };
    
    const stmt = {
      type: 'SwitchStatement',
      discriminant: ASTNodeBuilder.identifier('x'),
      cases: [
        {
          type: 'SwitchCase',
          test: null, // default case
          consequent: []
        }
      ]
    };
    
    expect(() => processStatement(stmt, handlers, state)).not.toThrow();
  });
});

describe('processStatement - BlockStatement', () => {
  it('should process all statements in block', () => {
    const handlers = {
      onReturn: vi.fn(() => ({ type: 'return' }))
    };
    const state = { outputs: [] };
    
    const stmt = ASTNodeBuilder.blockStatement([
      ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(1)),
      ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(2))
    ]);
    processStatement(stmt, handlers, state);
    
    expect(handlers.onReturn).toHaveBeenCalledTimes(2);
  });
});

describe('processStatement - Loops', () => {
  const loopTypes = ['ForStatement', 'ForOfStatement', 'ForInStatement', 'WhileStatement', 'DoWhileStatement'];
  
  loopTypes.forEach(loopType => {
    it(`should process ${loopType} body`, () => {
      const handlers = {
        onReturn: vi.fn(() => ({ type: 'return' }))
      };
      const state = { outputs: [] };
      
      const stmt = {
        type: loopType,
        body: ASTNodeBuilder.returnStatement(ASTNodeBuilder.literal(1))
      };
      processStatement(stmt, handlers, state);
      
      expect(handlers.onReturn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('processStatement - edge cases', () => {
  it('should handle null statement', () => {
    const handlers = {};
    const state = { outputs: [] };
    
    expect(() => processStatement(null, handlers, state)).not.toThrow();
  });

  it('should handle unknown statement type gracefully', () => {
    const handlers = {};
    const state = { outputs: [] };
    
    const stmt = {
      type: 'UnknownStatement',
      data: 'test'
    };
    
    expect(() => processStatement(stmt, handlers, state)).not.toThrow();
    expect(state.outputs).toEqual([]);
  });
});

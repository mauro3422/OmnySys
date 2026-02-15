/**
 * @fileoverview Output Extractor Module Index Tests
 * 
 * Tests for the output-extractor module index ensuring all exports
 * are correctly defined and accessible.
 * 
 * @module tests/unit/layer-a-analysis/extractors/data-flow/visitors/output-extractor/index
 */

import { describe, it, expect } from 'vitest';
import {
  OutputExtractor,
  extractReturn,
  extractImplicitReturn,
  createUndefinedReturn,
  extractThrow,
  extractSideEffect,
  extractSources,
  inferShape,
  extractProperties,
  getMemberPath,
  getCalleeName,
  getIdentifierName,
  getAssignmentTarget,
  nodeToString,
  findFunctionNode,
  isSideEffectCall,
  classifySideEffect,
  processStatements,
  processStatement
} from '#layer-a/extractors/data-flow/visitors/output-extractor/index.js';

describe('Output Extractor Module Index', () => {
  describe('Main Class Export', () => {
    it('should export OutputExtractor class', () => {
      expect(OutputExtractor).toBeDefined();
      expect(typeof OutputExtractor).toBe('function');
      expect(new OutputExtractor('test')).toBeInstanceOf(OutputExtractor);
    });
  });

  describe('Return Extractor Exports', () => {
    it('should export extractReturn function', () => {
      expect(extractReturn).toBeDefined();
      expect(typeof extractReturn).toBe('function');
    });

    it('should export extractImplicitReturn function', () => {
      expect(extractImplicitReturn).toBeDefined();
      expect(typeof extractImplicitReturn).toBe('function');
    });

    it('should export createUndefinedReturn function', () => {
      expect(createUndefinedReturn).toBeDefined();
      expect(typeof createUndefinedReturn).toBe('function');
    });
  });

  describe('Other Extractor Exports', () => {
    it('should export extractThrow function', () => {
      expect(extractThrow).toBeDefined();
      expect(typeof extractThrow).toBe('function');
    });

    it('should export extractSideEffect function', () => {
      expect(extractSideEffect).toBeDefined();
      expect(typeof extractSideEffect).toBe('function');
    });

    it('should export extractSources function', () => {
      expect(extractSources).toBeDefined();
      expect(typeof extractSources).toBe('function');
    });

    it('should export inferShape function', () => {
      expect(inferShape).toBeDefined();
      expect(typeof inferShape).toBe('function');
    });

    it('should export extractProperties function', () => {
      expect(extractProperties).toBeDefined();
      expect(typeof extractProperties).toBe('function');
    });
  });

  describe('AST Helper Exports', () => {
    it('should export getMemberPath function', () => {
      expect(getMemberPath).toBeDefined();
      expect(typeof getMemberPath).toBe('function');
    });

    it('should export getCalleeName function', () => {
      expect(getCalleeName).toBeDefined();
      expect(typeof getCalleeName).toBe('function');
    });

    it('should export getIdentifierName function', () => {
      expect(getIdentifierName).toBeDefined();
      expect(typeof getIdentifierName).toBe('function');
    });

    it('should export getAssignmentTarget function', () => {
      expect(getAssignmentTarget).toBeDefined();
      expect(typeof getAssignmentTarget).toBe('function');
    });

    it('should export nodeToString function', () => {
      expect(nodeToString).toBeDefined();
      expect(typeof nodeToString).toBe('function');
    });

    it('should export findFunctionNode function', () => {
      expect(findFunctionNode).toBeDefined();
      expect(typeof findFunctionNode).toBe('function');
    });
  });

  describe('Classifier Exports', () => {
    it('should export isSideEffectCall function', () => {
      expect(isSideEffectCall).toBeDefined();
      expect(typeof isSideEffectCall).toBe('function');
    });

    it('should export classifySideEffect function', () => {
      expect(classifySideEffect).toBeDefined();
      expect(typeof classifySideEffect).toBe('function');
    });
  });

  describe('Processor Exports', () => {
    it('should export processStatements function', () => {
      expect(processStatements).toBeDefined();
      expect(typeof processStatements).toBe('function');
    });

    it('should export processStatement function', () => {
      expect(processStatement).toBeDefined();
      expect(typeof processStatement).toBe('function');
    });
  });

  describe('Function Integration', () => {
    it('should be able to use extractReturn with AST node', () => {
      const returnStmt = {
        type: 'ReturnStatement',
        argument: { type: 'Literal', value: 42, raw: '42' },
        loc: { start: { line: 1 }, end: { line: 1 } }
      };
      
      const result = extractReturn(returnStmt);
      expect(result).toBeDefined();
      expect(result.type).toBe('return');
    });

    it('should be able to use createUndefinedReturn', () => {
      const result = createUndefinedReturn(10);
      expect(result).toBeDefined();
      expect(result.type).toBe('return');
      expect(result.value).toBe('undefined');
    });

    it('should be able to use processStatements with handlers', () => {
      const statements = [
        { type: 'ReturnStatement', argument: null, loc: { start: { line: 1 } } }
      ];
      const handlers = { onReturn: () => ({ type: 'return' }) };
      const state = { outputs: [], hasReturn: false };
      
      processStatements(statements, handlers, state);
      expect(state.hasReturn).toBe(true);
    });

    it('should be able to find function node in AST', () => {
      const ast = {
        type: 'Program',
        body: [{
          type: 'FunctionDeclaration',
          id: { type: 'Identifier', name: 'test' },
          params: [],
          body: { type: 'BlockStatement', body: [] }
        }]
      };
      
      const result = findFunctionNode(ast);
      expect(result).toBeDefined();
      expect(result.type).toBe('FunctionDeclaration');
    });
  });
});

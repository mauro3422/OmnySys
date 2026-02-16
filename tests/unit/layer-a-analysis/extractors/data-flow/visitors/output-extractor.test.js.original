/**
 * @fileoverview Output Extractor Legacy Tests
 * 
 * Tests for the legacy output-extractor.js compatibility layer
 * ensuring all exports are correctly re-exported from the modular version.
 * 
 * @module tests/unit/layer-a-analysis/extractors/data-flow/visitors/output-extractor
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
  processStatement,
  default as DefaultOutputExtractor
} from '#layer-a/extractors/data-flow/visitors/output-extractor.js';

describe('Output Extractor Legacy Module', () => {
  describe('Re-exports from modular version', () => {
    it('should export OutputExtractor class', () => {
      expect(OutputExtractor).toBeDefined();
      expect(typeof OutputExtractor).toBe('function');
    });

    it('should export all extractor functions', () => {
      expect(extractReturn).toBeDefined();
      expect(extractImplicitReturn).toBeDefined();
      expect(createUndefinedReturn).toBeDefined();
      expect(extractThrow).toBeDefined();
      expect(extractSideEffect).toBeDefined();
      expect(extractSources).toBeDefined();
      expect(inferShape).toBeDefined();
      expect(extractProperties).toBeDefined();
    });

    it('should export all AST helper functions', () => {
      expect(getMemberPath).toBeDefined();
      expect(getCalleeName).toBeDefined();
      expect(getIdentifierName).toBeDefined();
      expect(getAssignmentTarget).toBeDefined();
      expect(nodeToString).toBeDefined();
      expect(findFunctionNode).toBeDefined();
    });

    it('should export classifier functions', () => {
      expect(isSideEffectCall).toBeDefined();
      expect(classifySideEffect).toBeDefined();
    });

    it('should export processor functions', () => {
      expect(processStatements).toBeDefined();
      expect(processStatement).toBeDefined();
    });
  });

  describe('Default export', () => {
    it('should export OutputExtractor as default', () => {
      expect(DefaultOutputExtractor).toBeDefined();
      expect(DefaultOutputExtractor).toBe(OutputExtractor);
    });
  });

  describe('Functionality verification', () => {
    it('should be able to instantiate OutputExtractor', () => {
      const extractor = new OutputExtractor('function test() {}');
      expect(extractor).toBeInstanceOf(OutputExtractor);
    });

    it('should be able to use exported functions', () => {
      const undefinedReturn = createUndefinedReturn(10);
      expect(undefinedReturn.type).toBe('return');
      expect(undefinedReturn.value).toBe('undefined');
    });

    it('should maintain backward compatibility', () => {
      // Test that the legacy import style still works
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

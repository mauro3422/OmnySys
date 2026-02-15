/**
 * @fileoverview Transformation Extractor Module Index Tests
 * 
 * Tests for the transformation-extractor module index ensuring all exports
 * are correctly defined and accessible.
 * 
 * @module tests/unit/layer-a-analysis/extractors/data-flow/visitors/transformation-extractor/index
 */

import { describe, it, expect } from 'vitest';
import {
  TransformationExtractor,
  classifyOperation,
  OPERATION_TYPES,
  getOperationTypes,
  extractSources,
  extractSourcesWithContext,
  containsSource,
  filterInputSources,
  processStatement,
  processIfStatement,
  processTryStatement,
  processLoop,
  processBlock,
  createProcessingContext,
  processVariableDeclaration,
  processAssignment,
  processUpdateExpression,
  processExpressionStatement,
  processImplicitReturn,
  handleDestructuring,
  handleObjectDestructuring,
  handleArrayDestructuring,
  handleMutatingCall,
  isMutatingMethod,
  getAllMutatingMethods,
  analyzeMutationImpact,
  getMemberPath,
  getCalleeName,
  getIdentifierName,
  getAssignmentTarget,
  findFunctionNode,
  isImplicitReturn,
  VERSION
} from '#layer-a/extractors/data-flow/visitors/transformation-extractor/index.js';

describe('Transformation Extractor Module Index', () => {
  describe('Main Class Export', () => {
    it('should export TransformationExtractor class', () => {
      expect(TransformationExtractor).toBeDefined();
      expect(typeof TransformationExtractor).toBe('function');
    });
  });

  describe('Core Operation Exports', () => {
    it('should export classifyOperation function', () => {
      expect(classifyOperation).toBeDefined();
      expect(typeof classifyOperation).toBe('function');
    });

    it('should export OPERATION_TYPES constant', () => {
      expect(OPERATION_TYPES).toBeDefined();
      expect(typeof OPERATION_TYPES).toBe('object');
    });

    it('should export getOperationTypes function', () => {
      expect(getOperationTypes).toBeDefined();
      expect(typeof getOperationTypes).toBe('function');
    });
  });

  describe('Source Extractor Exports', () => {
    it('should export extractSources function', () => {
      expect(extractSources).toBeDefined();
      expect(typeof extractSources).toBe('function');
    });

    it('should export extractSourcesWithContext function', () => {
      expect(extractSourcesWithContext).toBeDefined();
      expect(typeof extractSourcesWithContext).toBe('function');
    });

    it('should export containsSource function', () => {
      expect(containsSource).toBeDefined();
      expect(typeof containsSource).toBe('function');
    });

    it('should export filterInputSources function', () => {
      expect(filterInputSources).toBeDefined();
      expect(typeof filterInputSources).toBe('function');
    });
  });

  describe('Processor Exports', () => {
    it('should export processStatement function', () => {
      expect(processStatement).toBeDefined();
      expect(typeof processStatement).toBe('function');
    });

    it('should export processIfStatement function', () => {
      expect(processIfStatement).toBeDefined();
      expect(typeof processIfStatement).toBe('function');
    });

    it('should export processTryStatement function', () => {
      expect(processTryStatement).toBeDefined();
      expect(typeof processTryStatement).toBe('function');
    });

    it('should export processLoop function', () => {
      expect(processLoop).toBeDefined();
      expect(typeof processLoop).toBe('function');
    });

    it('should export processBlock function', () => {
      expect(processBlock).toBeDefined();
      expect(typeof processBlock).toBe('function');
    });

    it('should export createProcessingContext function', () => {
      expect(createProcessingContext).toBeDefined();
      expect(typeof createProcessingContext).toBe('function');
    });

    it('should export processVariableDeclaration function', () => {
      expect(processVariableDeclaration).toBeDefined();
      expect(typeof processVariableDeclaration).toBe('function');
    });

    it('should export processAssignment function', () => {
      expect(processAssignment).toBeDefined();
      expect(typeof processAssignment).toBe('function');
    });

    it('should export processUpdateExpression function', () => {
      expect(processUpdateExpression).toBeDefined();
      expect(typeof processUpdateExpression).toBe('function');
    });

    it('should export processExpressionStatement function', () => {
      expect(processExpressionStatement).toBeDefined();
      expect(typeof processExpressionStatement).toBe('function');
    });

    it('should export processImplicitReturn function', () => {
      expect(processImplicitReturn).toBeDefined();
      expect(typeof processImplicitReturn).toBe('function');
    });
  });

  describe('Handler Exports', () => {
    it('should export handleDestructuring function', () => {
      expect(handleDestructuring).toBeDefined();
      expect(typeof handleDestructuring).toBe('function');
    });

    it('should export handleObjectDestructuring function', () => {
      expect(handleObjectDestructuring).toBeDefined();
      expect(typeof handleObjectDestructuring).toBe('function');
    });

    it('should export handleArrayDestructuring function', () => {
      expect(handleArrayDestructuring).toBeDefined();
      expect(typeof handleArrayDestructuring).toBe('function');
    });

    it('should export handleMutatingCall function', () => {
      expect(handleMutatingCall).toBeDefined();
      expect(typeof handleMutatingCall).toBe('function');
    });

    it('should export isMutatingMethod function', () => {
      expect(isMutatingMethod).toBeDefined();
      expect(typeof isMutatingMethod).toBe('function');
    });

    it('should export getAllMutatingMethods function', () => {
      expect(getAllMutatingMethods).toBeDefined();
      expect(typeof getAllMutatingMethods).toBe('function');
    });

    it('should export analyzeMutationImpact function', () => {
      expect(analyzeMutationImpact).toBeDefined();
      expect(typeof analyzeMutationImpact).toBe('function');
    });
  });

  describe('Utils Exports', () => {
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

    it('should export findFunctionNode function', () => {
      expect(findFunctionNode).toBeDefined();
      expect(typeof findFunctionNode).toBe('function');
    });

    it('should export isImplicitReturn function', () => {
      expect(isImplicitReturn).toBeDefined();
      expect(typeof isImplicitReturn).toBe('function');
    });
  });

  describe('Version Export', () => {
    it('should export VERSION constant', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      expect(VERSION).toBe('2.0.0');
    });
  });

  describe('Function Integration', () => {
    it('should be able to classify operations', () => {
      const node = { type: 'BinaryExpression', operator: '+' };
      const result = classifyOperation(node);
      expect(result).toBeDefined();
      expect(result.type).toBeDefined();
    });

    it('should be able to extract sources from node', () => {
      const node = { type: 'Identifier', name: 'x' };
      const result = extractSources(node);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should provide operation types', () => {
      const types = getOperationTypes();
      expect(typeof types).toBe('object');
    });

    it('should identify mutating methods', () => {
      expect(typeof isMutatingMethod('push')).toBe('boolean');
      expect(typeof isMutatingMethod('map')).toBe('boolean');
    });

    it('should get all mutating methods', () => {
      const methods = getAllMutatingMethods();
      expect(Array.isArray(methods)).toBe(true);
    });
  });
});

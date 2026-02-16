/**
 * @fileoverview Input Extractor Legacy Tests
 * 
 * Tests for the legacy input-extractor module.
 * 
 * @module tests/data-flow/visitors/input-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  InputExtractor,
  extractParameters,
  parseParameter,
  parseDestructuring,
  extractDefaultValue,
  findUsages,
  findFunctionNode,
  getIdentifierName
} from '#layer-a/extractors/data-flow/visitors/input-extractor.js';
import { parseCode } from '../__factories__/data-flow-test.factory.js';

describe('Input Extractor Legacy Module', () => {
  describe('Re-exports', () => {
    it('should re-export InputExtractor', () => {
      expect(typeof InputExtractor).toBe('function');
    });

    it('should re-export extractParameters', () => {
      expect(typeof extractParameters).toBe('function');
    });

    it('should re-export parseParameter', () => {
      expect(typeof parseParameter).toBe('function');
    });

    it('should re-export parseDestructuring', () => {
      expect(typeof parseDestructuring).toBe('function');
    });

    it('should re-export findUsages', () => {
      expect(typeof findUsages).toBe('function');
    });

    it('should re-export findFunctionNode', () => {
      expect(typeof findFunctionNode).toBe('function');
    });

    it('should re-export getIdentifierName', () => {
      expect(typeof getIdentifierName).toBe('function');
    });
  });

  describe('Integration', () => {
    it('should work through legacy export', () => {
      const extractor = new InputExtractor();
      const ast = parseCode('function foo(x, y) { return x + y; }');
      
      const inputs = extractor.extract(ast);

      expect(inputs).toHaveLength(2);
      expect(inputs[0].name).toBe('x');
      expect(inputs[1].name).toBe('y');
    });

    it('should have matching functionality with new module', () => {
      const legacyExtractor = new InputExtractor();
      const ast = parseCode('function foo({ a, b }) { return a + b; }');
      
      const inputs = legacyExtractor.extract(ast);

      expect(inputs).toHaveLength(1);
      expect(inputs[0].type).toBe('destructured-object');
      expect(inputs[0].properties).toHaveLength(2);
    });
  });
});

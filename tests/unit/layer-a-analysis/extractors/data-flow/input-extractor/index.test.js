/**
 * @fileoverview Input Extractor Module Index Tests
 * 
 * Tests for the input-extractor module exports.
 * 
 * @module tests/data-flow/input-extractor/index
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
} from '../../../../../../src/layer-a-static/extractors/data-flow/visitors/input-extractor/index.js';

describe('Input Extractor Module', () => {
  describe('Exports', () => {
    it('should export InputExtractor class', () => {
      expect(typeof InputExtractor).toBe('function');
    });

    it('should export extractParameters function', () => {
      expect(typeof extractParameters).toBe('function');
    });

    it('should export parseParameter function', () => {
      expect(typeof parseParameter).toBe('function');
    });

    it('should export parseDestructuring function', () => {
      expect(typeof parseDestructuring).toBe('function');
    });

    it('should export extractDefaultValue function', () => {
      expect(typeof extractDefaultValue).toBe('function');
    });

    it('should export findUsages function', () => {
      expect(typeof findUsages).toBe('function');
    });

    it('should export findFunctionNode function', () => {
      expect(typeof findFunctionNode).toBe('function');
    });

    it('should export getIdentifierName function', () => {
      expect(typeof getIdentifierName).toBe('function');
    });
  });

  describe('Integration', () => {
    it('should have consistent InputExtractor export', () => {
      const extractor = new InputExtractor();
      expect(typeof extractor.extract).toBe('function');
    });
  });
});

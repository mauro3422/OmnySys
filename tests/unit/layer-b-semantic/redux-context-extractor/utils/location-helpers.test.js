/**
 * @fileoverview location-helpers.test.js
 * 
 * Tests para helpers de ubicación
 * 
 * @module tests/unit/layer-b-semantic/redux-context-extractor/utils/location-helpers
 */

import { describe, it, expect } from 'vitest';
import { getLineNumber } from '#layer-b/redux-context-extractor/utils/location-helpers.js';

describe('redux-context-extractor/utils/location-helpers', () => {
  describe('getLineNumber', () => {
    it('should return 1 for index 0', () => {
      const code = 'const x = 1;';
      
      const result = getLineNumber(code, 0);
      
      expect(result).toBe(1);
    });

    it('should return 1 for first line', () => {
      const code = 'const x = 1;\nconst y = 2;';
      
      const result = getLineNumber(code, 5);
      
      expect(result).toBe(1);
    });

    it('should return 2 for second line', () => {
      const code = 'const x = 1;\nconst y = 2;';
      
      const result = getLineNumber(code, 13);
      
      expect(result).toBe(2);
    });

    it('should return correct line for multi-line code', () => {
      const code = 'line1\nline2\nline3\nline4';
      
      expect(getLineNumber(code, 0)).toBe(1);
      expect(getLineNumber(code, 6)).toBe(2);
      expect(getLineNumber(code, 12)).toBe(3);
      expect(getLineNumber(code, 18)).toBe(4);
    });

    it('should handle empty code', () => {
      const code = '';
      
      const result = getLineNumber(code, 0);
      
      expect(result).toBe(1);
    });

    it('should handle single line', () => {
      const code = 'single line';
      
      const result = getLineNumber(code, 10);
      
      expect(result).toBe(1);
    });

    it('should handle index at line boundary', () => {
      const code = 'line1\nline2';
      
      const result = getLineNumber(code, 6);
      
      expect(result).toBe(2);
    });

    it('should handle index at end of code', () => {
      const code = 'line1\nline2\nline3';
      
      const result = getLineNumber(code, code.length);
      
      expect(result).toBe(3);
    });
  });
});

/**
 * @fileoverview response-sanitizer.test.js
 * 
 * Tests para sanitización de respuestas LLM
 * 
 * @module tests/unit/layer-b-semantic/validators/sanitizers/response-sanitizer
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeReasoning,
  clampConfidence,
  sanitizeResponseObject
} from '#layer-b/validators/sanitizers/response-sanitizer.js';
import { LLMResponseBuilder } from '../../../../factories/layer-b-validators/builders.js';
import { DEFAULT_REASONING, MAX_REASONING_LENGTH } from '#layer-b/validators/constants.js';

describe('validators/sanitizers/response-sanitizer', () => {
  describe('sanitizeReasoning', () => {
    it('should return default reasoning for null', () => {
      expect(sanitizeReasoning(null)).toBe(DEFAULT_REASONING);
    });

    it('should return default reasoning for undefined', () => {
      expect(sanitizeReasoning(undefined)).toBe(DEFAULT_REASONING);
    });

    it('should return default reasoning for empty string', () => {
      expect(sanitizeReasoning('')).toBe(DEFAULT_REASONING);
    });

    it('should return default reasoning for non-string', () => {
      expect(sanitizeReasoning(123)).toBe(DEFAULT_REASONING);
      expect(sanitizeReasoning({})).toBe(DEFAULT_REASONING);
      expect(sanitizeReasoning([])).toBe(DEFAULT_REASONING);
    });

    it('should return reasoning as-is when within limit', () => {
      const reasoning = 'Short reasoning';
      expect(sanitizeReasoning(reasoning)).toBe(reasoning);
    });

    it('should truncate reasoning when too long', () => {
      const longReasoning = 'a'.repeat(MAX_REASONING_LENGTH + 50);
      const result = sanitizeReasoning(longReasoning);
      expect(result.length).toBe(MAX_REASONING_LENGTH);
      expect(result).toBe('a'.repeat(MAX_REASONING_LENGTH));
    });

    it('should handle reasoning at exact limit', () => {
      const exactReasoning = 'a'.repeat(MAX_REASONING_LENGTH);
      expect(sanitizeReasoning(exactReasoning)).toBe(exactReasoning);
    });

    it('should handle reasoning just under limit', () => {
      const reasoning = 'a'.repeat(MAX_REASONING_LENGTH - 1);
      expect(sanitizeReasoning(reasoning)).toBe(reasoning);
    });
  });

  describe('clampConfidence', () => {
    it('should return 0.5 for non-number input', () => {
      expect(clampConfidence(null)).toBe(0.5);
      expect(clampConfidence(undefined)).toBe(0.5);
      expect(clampConfidence('string')).toBe(0.5);
      expect(clampConfidence({})).toBe(0.5);
      expect(clampConfidence([])).toBe(0.5);
    });

    it('should clamp negative values to 0', () => {
      expect(clampConfidence(-1)).toBe(0);
      expect(clampConfidence(-0.5)).toBe(0);
      expect(clampConfidence(-100)).toBe(0);
    });

    it('should clamp values above 1 to 1', () => {
      expect(clampConfidence(1.5)).toBe(1);
      expect(clampConfidence(2)).toBe(1);
      expect(clampConfidence(100)).toBe(1);
    });

    it('should return valid values as-is', () => {
      expect(clampConfidence(0)).toBe(0);
      expect(clampConfidence(0.5)).toBe(0.5);
      expect(clampConfidence(1)).toBe(1);
      expect(clampConfidence(0.75)).toBe(0.75);
      expect(clampConfidence(0.123456)).toBe(0.123456);
    });

    it('should handle edge cases', () => {
      expect(clampConfidence(0.0001)).toBe(0.0001);
      expect(clampConfidence(0.9999)).toBe(0.9999);
    });
  });

  describe('sanitizeResponseObject', () => {
    it('should return default response for null', () => {
      const result = sanitizeResponseObject(null);
      expect(result).toEqual({
        localStorageKeys: [],
        eventNames: [],
        connectedFiles: [],
        connectionType: 'none',
        confidence: 0.5,
        reasoning: DEFAULT_REASONING
      });
    });

    it('should return default response for undefined', () => {
      const result = sanitizeResponseObject(undefined);
      expect(result).toEqual({
        localStorageKeys: [],
        eventNames: [],
        connectedFiles: [],
        connectionType: 'none',
        confidence: 0.5,
        reasoning: DEFAULT_REASONING
      });
    });

    it('should return default response for non-object', () => {
      const result = sanitizeResponseObject('string');
      expect(result).toEqual({
        localStorageKeys: [],
        eventNames: [],
        connectedFiles: [],
        connectionType: 'none',
        confidence: 0.5,
        reasoning: DEFAULT_REASONING
      });
    });

    it('should sanitize valid response object', () => {
      const response = new LLMResponseBuilder()
        .withLocalStorageKeys(['key1'])
        .withEventNames(['event1'])
        .withConnectedFiles(['file1.js'])
        .withConnectionType('mixed')
        .withConfidence(0.9)
        .withReasoning('Valid connections')
        .build();
      
      const result = sanitizeResponseObject(response);
      expect(result.localStorageKeys).toEqual(['key1']);
      expect(result.eventNames).toEqual(['event1']);
      expect(result.connectedFiles).toEqual(['file1.js']);
      expect(result.connectionType).toBe('mixed');
      expect(result.confidence).toBe(0.9);
      expect(result.reasoning).toBe('Valid connections');
    });

    it('should clamp confidence in response', () => {
      const response = { confidence: 1.5, reasoning: 'Test' };
      const result = sanitizeResponseObject(response);
      expect(result.confidence).toBe(1);
    });

    it('should truncate reasoning in response', () => {
      const response = { 
        confidence: 0.8, 
        reasoning: 'a'.repeat(MAX_REASONING_LENGTH + 50) 
      };
      const result = sanitizeResponseObject(response);
      expect(result.reasoning.length).toBe(MAX_REASONING_LENGTH);
    });

    it('should preserve additional properties', () => {
      const response = {
        localStorageKeys: [],
        eventNames: [],
        connectedFiles: [],
        connectionType: 'none',
        confidence: 0.5,
        reasoning: 'Test',
        extraField: 'extraValue',
        anotherField: 123
      };
      
      const result = sanitizeResponseObject(response);
      expect(result.extraField).toBe('extraValue');
      expect(result.anotherField).toBe(123);
    });
  });
});

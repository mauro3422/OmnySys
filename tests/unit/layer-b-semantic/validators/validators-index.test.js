/**
 * @fileoverview validators-index.test.js
 * 
 * Tests para el facade principal de validators
 * 
 * @module tests/unit/layer-b-semantic/validators/index
 */

import { describe, it, expect } from 'vitest';
import {
  validateLLMResponse,
  sanitizeGlobalStateResponse,
  calculateDynamicTimeout,
  // Constants
  LOCALSTORAGE_METHODS,
  DOM_METHODS,
  GENERIC_PLACEHOLDERS,
  LOCALSTORAGE_PATTERNS,
  EVENT_PATTERNS,
  GLOBAL_PATTERNS,
  TIMEOUT_CONFIG,
  ConnectionType,
  DEFAULT_REASONING,
  MAX_REASONING_LENGTH,
  // Extractors
  extractActualLocalStorageKeys,
  extractValidStorageKeys,
  storageKeyExists,
  extractActualEventNames,
  extractValidEventNames,
  eventNameExists,
  extractActualGlobalVariables,
  extractValidGlobalVariables,
  globalVariableExists,
  // Validators
  validateLocalStorageKeys,
  filterInvalidStorageKeys,
  calculateStorageConfidence,
  validateEventNames,
  filterInvalidEventNames,
  calculateEventConfidence,
  validateConnectedFiles,
  fileExistsInProject,
  normalizeFilePath,
  isValidGlobalVariable,
  // Sanitizers
  sanitizeReasoning,
  clampConfidence,
  sanitizeResponseObject,
  determineConnectionType,
  hasValidContent,
  filterInsufficientEvidence,
  // Utils
  isLocalStorageMethod,
  isDOMMethod,
  isGenericPlaceholder,
  isJavaScriptCode,
  isGenericPath,
  looksLikeValidPath,
  normalizeGlobalName,
  extractVariableName,
  calculateBatchTimeout
} from '#layer-b/validators/index.js';
import { LLMResponseBuilder, CodeSampleBuilder } from '../../../factories/layer-b-validators/builders.js';

describe('validators/index - Main Facade', () => {
  describe('Constants Export', () => {
    it('should export LOCALSTORAGE_METHODS', () => {
      expect(Array.isArray(LOCALSTORAGE_METHODS)).toBe(true);
      expect(LOCALSTORAGE_METHODS).toContain('setItem');
      expect(LOCALSTORAGE_METHODS).toContain('getItem');
    });

    it('should export DOM_METHODS', () => {
      expect(Array.isArray(DOM_METHODS)).toBe(true);
      expect(DOM_METHODS).toContain('addEventListener');
      expect(DOM_METHODS).toContain('click');
    });

    it('should export GENERIC_PLACEHOLDERS', () => {
      expect(Array.isArray(GENERIC_PLACEHOLDERS)).toBe(true);
      expect(GENERIC_PLACEHOLDERS).toContain('key1');
      expect(GENERIC_PLACEHOLDERS).toContain('event1');
    });

    it('should export ConnectionType enum', () => {
      expect(ConnectionType.NONE).toBe('none');
      expect(ConnectionType.LOCALSTORAGE).toBe('localStorage');
      expect(ConnectionType.EVENT).toBe('event');
      expect(ConnectionType.MIXED).toBe('mixed');
    });

    it('should export TIMEOUT_CONFIG', () => {
      expect(TIMEOUT_CONFIG).toHaveProperty('baseTimeout');
      expect(TIMEOUT_CONFIG).toHaveProperty('sizeFactor');
      expect(TIMEOUT_CONFIG).toHaveProperty('maxTimeout');
    });
  });

  describe('validateLLMResponse', () => {
    it('should return null for null response', () => {
      expect(validateLLMResponse(null, 'code')).toBeNull();
    });

    it('should return null for non-object response', () => {
      expect(validateLLMResponse('string', 'code')).toBeNull();
    });

    it('should validate and sanitize valid response', () => {
      const { code, localStorageKeys: actualKeys } = new CodeSampleBuilder()
        .withLocalStorageKey('userToken')
        .build();
      
      const response = new LLMResponseBuilder()
        .withLocalStorageKeys(['userToken', 'fakeKey'])
        .withConfidence(0.9)
        .withReasoning('Valid connections')
        .build();
      
      const result = validateLLMResponse(response, code, []);
      expect(result).not.toBeNull();
      expect(result.localStorageKeys).toContain('userToken');
      expect(result.localStorageKeys).not.toContain('fakeKey');
      expect(result.confidence).toBe(0.9);
    });

    it('should return null when no valid content', () => {
      const response = new LLMResponseBuilder()
        .asNoConnection()
        .build();
      
      const result = validateLLMResponse(response, '', []);
      expect(result).toBeNull();
    });
  });

  describe('calculateDynamicTimeout', () => {
    it('should calculate timeout for small code', () => {
      const code = 'x'.repeat(500);
      const timeout = calculateDynamicTimeout(code);
      expect(timeout).toBeGreaterThanOrEqual(20000);
      expect(timeout).toBeLessThanOrEqual(120000);
    });

    it('should calculate timeout for large code', () => {
      const code = 'x'.repeat(10000);
      const timeout = calculateDynamicTimeout(code);
      expect(timeout).toBeGreaterThan(20000);
      expect(timeout).toBeLessThanOrEqual(120000);
    });

    it('should cap at max timeout', () => {
      const code = 'x'.repeat(200000);
      const timeout = calculateDynamicTimeout(code);
      expect(timeout).toBe(120000);
    });
  });

  describe('Integration - End to End', () => {
    it('should validate complete workflow with localStorage connection', () => {
      const { code } = new CodeSampleBuilder()
        .withLocalStorageKey('sessionId')
        .withLocalStorageKey('userPrefs')
        .build();
      
      const llmResponse = new LLMResponseBuilder()
        .withLocalStorageKeys(['sessionId', 'userPrefs', 'fakeKey'])
        .withConnectionType('localStorage')
        .withConfidence(0.85)
        .build();
      
      const result = validateLLMResponse(llmResponse, code);
      expect(result).not.toBeNull();
      expect(result.localStorageKeys).toContain('sessionId');
      expect(result.localStorageKeys).toContain('userPrefs');
      expect(result.localStorageKeys).not.toContain('fakeKey');
      expect(result.connectionType).toBe('localStorage');
      expect(result.confidence).toBe(0.85);
    });

    it('should validate complete workflow with event connection', () => {
      const { code } = new CodeSampleBuilder()
        .withEventListener('user:login')
        .withEventListener('data:update')
        .build();
      
      const llmResponse = new LLMResponseBuilder()
        .withEventNames(['user:login', 'data:update'])
        .withConnectionType('event')
        .withConfidence(0.9)
        .build();
      
      const result = validateLLMResponse(llmResponse, code);
      expect(result).not.toBeNull();
      expect(result.eventNames).toContain('user:login');
      expect(result.eventNames).toContain('data:update');
    });
  });
});

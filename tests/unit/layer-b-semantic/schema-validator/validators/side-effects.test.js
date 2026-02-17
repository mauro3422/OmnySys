/**
 * @fileoverview side-effects.test.js
 * 
 * Tests para validación de side effects
 * 
 * @module tests/unit/layer-b-semantic/schema-validator/validators/side-effects
 */

import { describe, it, expect } from 'vitest';
import { validateSideEffects } from '#layer-b/schema-validator/validators/side-effects.js';

describe('schema-validator/validators/side-effects', () => {
  describe('validateSideEffects', () => {
    it('should validate valid side effects', () => {
      const sideEffects = {
        hasGlobalAccess: false,
        modifiesDOM: true
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty side effects', () => {
      const sideEffects = {};
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid keys', () => {
      const sideEffects = {
        hasGlobalAccess: false,
        invalidKey: true
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid side effect key: invalidKey');
    });

    it('should validate all valid keys', () => {
      const validKeys = [
        'hasGlobalAccess',
        'modifiesDOM',
        'makesNetworkCalls',
        'usesLocalStorage',
        'accessesWindow',
        'modifiesGlobalState',
        'hasEventListeners',
        'usesTimers'
      ];
      
      validKeys.forEach(key => {
        const sideEffects = { [key]: true };
        const result = validateSideEffects(sideEffects);
        expect(result.errors.some(e => e.includes('Invalid side effect key'))).toBe(false);
      });
    });

    it('should validate values are boolean', () => {
      const sideEffects = {
        hasGlobalAccess: 'yes'
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid side effect value'))).toBe(true);
    });

    it('should handle multiple invalid values', () => {
      const sideEffects = {
        hasGlobalAccess: 'yes',
        modifiesDOM: 1,
        makesNetworkCalls: null
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });

    it('should accept false values', () => {
      const sideEffects = {
        hasGlobalAccess: false,
        modifiesDOM: false,
        makesNetworkCalls: false
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(true);
    });

    it('should accept mixed boolean values', () => {
      const sideEffects = {
        hasGlobalAccess: true,
        modifiesDOM: false,
        makesNetworkCalls: true
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(true);
    });

    it('should handle number values as invalid', () => {
      const sideEffects = {
        hasGlobalAccess: 0
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(false);
    });

    it('should handle undefined values as invalid', () => {
      const sideEffects = {
        hasGlobalAccess: undefined
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(false);
    });

    it('should handle null values as invalid', () => {
      const sideEffects = {
        hasGlobalAccess: null
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(false);
    });

    it('should report both invalid key and invalid value', () => {
      const sideEffects = {
        invalidKey: 'not a boolean'
      };
      
      const result = validateSideEffects(sideEffects);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });
});

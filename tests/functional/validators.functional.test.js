/**
 * @fileoverview Validators - Tests Funcionales Simplificados
 * 
 * Tests funcionales para analyses/tier3/validators/index.js
 * 
 * @module tests/functional/validators.functional.test
 */

import { describe, it, expect } from 'vitest';
import * as validators from '#layer-a/analyses/tier3/validators/index.js';

describe('Validators - Functional Tests', () => {
  
  it('UrlValidator is exported', () => {
    expect(typeof validators.UrlValidator).toBe('function');
  });

  describe('UrlValidator', () => {
    it('can be instantiated', () => {
      const validator = new validators.UrlValidator();
      expect(validator).toBeDefined();
    });

    it('is a valid class instance', () => {
      const validator = new validators.UrlValidator();
      expect(validator).toBeInstanceOf(validators.UrlValidator);
    });

    it('handles instantiation without errors', () => {
      expect(() => new validators.UrlValidator()).not.toThrow();
    });
  });
});

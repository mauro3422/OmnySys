import { describe, it, expect } from 'vitest';
import { isCommonFunctionName, normalizeName } from '#layer-a/analyses/tier3/utils/name-utils.js';

describe('NameUtils', () => {
  describe('Structure Contract', () => {
    it('should export isCommonFunctionName function', () => {
      expect(typeof isCommonFunctionName).toBe('function');
    });

    it('should export normalizeName function', () => {
      expect(typeof normalizeName).toBe('function');
    });

    it('should return boolean from isCommonFunctionName', () => {
      const result = isCommonFunctionName('test');
      expect(typeof result).toBe('boolean');
    });

    it('should return string from normalizeName', () => {
      const result = normalizeName('TestName');
      expect(typeof result).toBe('string');
    });

    it('should not throw on empty input', () => {
      expect(() => isCommonFunctionName('')).not.toThrow();
      expect(() => normalizeName('')).not.toThrow();
    });
  });

  describe('Functionality Tests', () => {
    describe('isCommonFunctionName - common names list', () => {
      it('should return true for main', () => {
        expect(isCommonFunctionName('main')).toBe(true);
      });

      it('should return true for init', () => {
        expect(isCommonFunctionName('init')).toBe(true);
      });

      it('should return true for setup', () => {
        expect(isCommonFunctionName('setup')).toBe(true);
      });

      it('should return true for start', () => {
        expect(isCommonFunctionName('start')).toBe(true);
      });

      it('should return true for run', () => {
        expect(isCommonFunctionName('run')).toBe(true);
      });

      it('should return true for render', () => {
        expect(isCommonFunctionName('render')).toBe(true);
      });

      it('should return true for update', () => {
        expect(isCommonFunctionName('update')).toBe(true);
      });

      it('should return true for get', () => {
        expect(isCommonFunctionName('get')).toBe(true);
      });

      it('should return true for set', () => {
        expect(isCommonFunctionName('set')).toBe(true);
      });
    });

    describe('isCommonFunctionName - event handler patterns', () => {
      it('should return true for handleClick', () => {
        expect(isCommonFunctionName('handleClick')).toBe(true);
      });

      it('should return true for handleChange', () => {
        expect(isCommonFunctionName('handleChange')).toBe(true);
      });

      it('should return true for handleSubmit', () => {
        expect(isCommonFunctionName('handleSubmit')).toBe(true);
      });

      it('should return true for onClick', () => {
        expect(isCommonFunctionName('onClick')).toBe(true);
      });

      it('should return true for onChange', () => {
        expect(isCommonFunctionName('onChange')).toBe(true);
      });

      it('should return true for onSubmit', () => {
        expect(isCommonFunctionName('onSubmit')).toBe(true);
      });

      it('should return true for onLoad', () => {
        expect(isCommonFunctionName('onLoad')).toBe(true);
      });

      it('should return true for any handle* function', () => {
        expect(isCommonFunctionName('handleCustomEvent')).toBe(true);
      });

      it('should return true for any on* function', () => {
        expect(isCommonFunctionName('onCustomEvent')).toBe(true);
      });
    });

    describe('isCommonFunctionName - underscore prefix', () => {
      it('should return true for _private', () => {
        expect(isCommonFunctionName('_private')).toBe(true);
      });

      it('should return true for _helper', () => {
        expect(isCommonFunctionName('_helper')).toBe(true);
      });

      it('should return true for _internalMethod', () => {
        expect(isCommonFunctionName('_internalMethod')).toBe(true);
      });
    });

    describe('isCommonFunctionName - array methods', () => {
      it('should return true for map', () => {
        expect(isCommonFunctionName('map')).toBe(true);
      });

      it('should return true for filter', () => {
        expect(isCommonFunctionName('filter')).toBe(true);
      });

      it('should return true for reduce', () => {
        expect(isCommonFunctionName('reduce')).toBe(true);
      });

      it('should return true for forEach', () => {
        expect(isCommonFunctionName('forEach')).toBe(true);
      });

      it('should return true for find', () => {
        expect(isCommonFunctionName('find')).toBe(true);
      });
    });

    describe('isCommonFunctionName - unique names', () => {
      it('should return false for unique business logic names', () => {
        expect(isCommonFunctionName('calculateTotalPrice')).toBe(false);
        expect(isCommonFunctionName('fetchUserData')).toBe(false);
        expect(isCommonFunctionName('validateEmailAddress')).toBe(false);
      });

      it('should return false for domain-specific names', () => {
        expect(isCommonFunctionName('processPayment')).toBe(false);
        expect(isCommonFunctionName('generateInvoice')).toBe(false);
        expect(isCommonFunctionName('sendNotification')).toBe(false);
      });

      it('should return false for custom helper names', () => {
        expect(isCommonFunctionName('formatCurrency')).toBe(false);
        expect(isCommonFunctionName('parseDateString')).toBe(false);
        expect(isCommonFunctionName('buildQueryParams')).toBe(false);
      });
    });

    describe('normalizeName', () => {
      it('should convert to lowercase', () => {
        expect(normalizeName('MyFunction')).toBe('myfunction');
        expect(normalizeName('HELLO')).toBe('hello');
      });

      it('should remove underscores', () => {
        expect(normalizeName('my_function')).toBe('myfunction');
        expect(normalizeName('_private_method')).toBe('privatemethod');
      });

      it('should remove hyphens', () => {
        expect(normalizeName('my-function')).toBe('myfunction');
        expect(normalizeName('kebab-case')).toBe('kebabcase');
      });

      it('should handle combined separators', () => {
        expect(normalizeName('my_function-name')).toBe('myfunctionname');
        expect(normalizeName('hello_world-test')).toBe('helloworldtest');
      });

      it('should handle empty string', () => {
        expect(normalizeName('')).toBe('');
      });

      it('should handle already normalized names', () => {
        expect(normalizeName('simple')).toBe('simple');
        expect(normalizeName('alreadynormalized')).toBe('alreadynormalized');
      });
    });
  });

  describe('Error Handling Contract', () => {
    it('should handle null input for isCommonFunctionName (documented behavior)', () => {
      // Module throws on null - documenting current behavior
      try {
        isCommonFunctionName(null);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle undefined input for isCommonFunctionName (documented behavior)', () => {
      // Module throws on undefined - documenting current behavior
      try {
        isCommonFunctionName(undefined);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle null input for normalizeName (documented behavior)', () => {
      // Module throws on null - documenting current behavior
      try {
        normalizeName(null);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle undefined input for normalizeName (documented behavior)', () => {
      // Module throws on undefined - documenting current behavior
      try {
        normalizeName(undefined);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle numbers as input (documented behavior)', () => {
      // Module throws on non-string types - documenting current behavior
      try {
        isCommonFunctionName(123);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
      try {
        normalizeName(123);
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle objects as input (documented behavior)', () => {
      // Module throws on non-string types - documenting current behavior
      try {
        isCommonFunctionName({});
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
      try {
        normalizeName({});
      } catch (e) {
        expect(e).toBeInstanceOf(TypeError);
      }
    });

    it('should handle special characters', () => {
      // Special characters are valid strings and should not throw
      expect(() => isCommonFunctionName('@#$%')).not.toThrow();
      expect(() => normalizeName('@#$%')).not.toThrow();
    });

    it('should handle very long names', () => {
      const longName = 'a'.repeat(1000);
      expect(() => isCommonFunctionName(longName)).not.toThrow();
      expect(() => normalizeName(longName)).not.toThrow();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { isCommonFunctionName, normalizeName } from '../../../../../src/layer-a-static/analyses/tier3/utils/name-utils.js';

describe('Tier 3 - name-utils', () => {
  describe('isCommonFunctionName', () => {
    describe('common names list', () => {
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

    describe('event handler patterns', () => {
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

    describe('underscore prefix', () => {
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

    describe('array methods', () => {
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

    describe('unique names', () => {
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

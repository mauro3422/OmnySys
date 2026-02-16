/**
 * @fileoverview Tests for type-inference.js extractor
 * 
 * @module tests/type-inference
 */

import { describe, it, expect } from 'vitest';
import { extractTypeInference } from '#layer-a/extractors/metadata/type-inference.js';

describe('type-inference', () => {
  describe('basic structure', () => {
    it('should export extractTypeInference function', () => {
      expect(typeof extractTypeInference).toBe('function');
    });

    it('should return object with all expected properties', () => {
      const result = extractTypeInference('');
      expect(result).toHaveProperty('typeofChecks');
      expect(result).toHaveProperty('instanceofChecks');
      expect(result).toHaveProperty('defaultValues');
      expect(result).toHaveProperty('jsdocTypes');
      expect(result).toHaveProperty('nullChecks');
      expect(result).toHaveProperty('all');
    });
  });

  describe('typeof checks', () => {
    it('should detect typeof === checks', () => {
      const code = 'if (typeof x === "string") { }';
      const result = extractTypeInference(code);
      expect(result.typeofChecks).toHaveLength(1);
      expect(result.typeofChecks[0]).toMatchObject({
        variable: 'x',
        type: 'string',
        operator: '==='
      });
    });

    it('should detect typeof !== checks', () => {
      const code = 'if (typeof x !== "undefined") { }';
      const result = extractTypeInference(code);
      expect(result.typeofChecks[0]).toMatchObject({
        variable: 'x',
        type: 'undefined',
        operator: '!==' 
      });
    });

    it('should detect typeof == checks', () => {
      const code = 'if (typeof x == "number") { }';
      const result = extractTypeInference(code);
      expect(result.typeofChecks[0].operator).toBe('==');
    });

    it('should detect multiple typeof checks', () => {
      const code = `
        if (typeof a === "string") { }
        if (typeof b === "number") { }
        if (typeof c === "object") { }
      `;
      const result = extractTypeInference(code);
      expect(result.typeofChecks).toHaveLength(3);
    });

    it('should include line numbers', () => {
      const code = 'if (typeof x === "string") { }';
      const result = extractTypeInference(code);
      expect(result.typeofChecks[0].line).toBeDefined();
      expect(typeof result.typeofChecks[0].line).toBe('number');
    });
  });

  describe('instanceof checks', () => {
    it('should detect instanceof checks', () => {
      const code = 'if (obj instanceof Date) { }';
      const result = extractTypeInference(code);
      expect(result.instanceofChecks).toHaveLength(1);
      expect(result.instanceofChecks[0]).toMatchObject({
        variable: 'obj',
        class: 'Date'
      });
    });

    it('should detect custom class instanceof', () => {
      const code = 'if (err instanceof ValidationError) { }';
      const result = extractTypeInference(code);
      expect(result.instanceofChecks[0].class).toBe('ValidationError');
    });

    it('should detect multiple instanceof checks', () => {
      const code = `
        if (a instanceof Array) { }
        if (b instanceof Object) { }
      `;
      const result = extractTypeInference(code);
      expect(result.instanceofChecks).toHaveLength(2);
    });

    it('should include line numbers', () => {
      const code = 'if (x instanceof Date) { }';
      const result = extractTypeInference(code);
      expect(result.instanceofChecks[0].line).toBeDefined();
    });
  });

  describe('default value inference', () => {
    it('should infer string from string default', () => {
      const code = 'const name = param || "default";';
      const result = extractTypeInference(code);
      expect(result.defaultValues).toHaveLength(1);
      expect(result.defaultValues[0]).toMatchObject({
        param: 'param',
        defaultValue: '"default"',
        inferredType: 'string'
      });
    });

    it('should infer number from numeric default', () => {
      const code = 'const count = param || 42;';
      const result = extractTypeInference(code);
      expect(result.defaultValues[0].inferredType).toBe('number');
    });

    it('should infer boolean from true default', () => {
      const code = 'const enabled = param || true;';
      const result = extractTypeInference(code);
      expect(result.defaultValues[0].inferredType).toBe('boolean');
    });

    it('should infer boolean from false default', () => {
      const code = 'const disabled = param || false;';
      const result = extractTypeInference(code);
      expect(result.defaultValues[0].inferredType).toBe('boolean');
    });

    it('should infer array from [] default', () => {
      const code = 'const items = param || [];';
      const result = extractTypeInference(code);
      expect(result.defaultValues[0].inferredType).toBe('array');
    });

    it('should infer object from {} default', () => {
      const code = 'const config = param || {};';
      const result = extractTypeInference(code);
      expect(result.defaultValues[0].inferredType).toBe('object');
    });

    it('should infer null from null default', () => {
      const code = 'const value = param || null;';
      const result = extractTypeInference(code);
      expect(result.defaultValues[0].inferredType).toBe('null');
    });

    it('should return unknown for complex defaults', () => {
      const code = 'const x = param || getDefault();';
      const result = extractTypeInference(code);
      expect(result.defaultValues[0].inferredType).toBe('unknown');
    });
  });

  describe('JSDoc type detection', () => {
    it('should detect @param types', () => {
      const code = '/** @param {string} name */';
      const result = extractTypeInference(code);
      expect(result.jsdocTypes).toHaveLength(1);
      expect(result.jsdocTypes[0]).toMatchObject({
        name: 'name',
        type: 'string',
        source: 'jsdoc'
      });
    });

    it('should detect complex @param types', () => {
      const code = '/** @param {Object.<string, number>} map */';
      const result = extractTypeInference(code);
      expect(result.jsdocTypes[0].type).toBe('Object.<string, number>');
    });

    it('should detect optional params', () => {
      const code = '/** @param {string} [optional] */';
      const result = extractTypeInference(code);
      expect(result.jsdocTypes[0].name).toBe('[optional]');
    });

    it('should detect @type annotations', () => {
      const code = '/** @type {number} */';
      const result = extractTypeInference(code);
      expect(result.jsdocTypes[0]).toMatchObject({
        type: 'number',
        source: 'jsdoc-type'
      });
    });

    it('should include line numbers', () => {
      const code = '/** @param {string} x */';
      const result = extractTypeInference(code);
      expect(result.jsdocTypes[0].line).toBeDefined();
    });
  });

  describe('null checks', () => {
    it('should detect === null checks', () => {
      const code = 'if (x === null) { }';
      const result = extractTypeInference(code);
      expect(result.nullChecks).toHaveLength(1);
      expect(result.nullChecks[0]).toMatchObject({
        variable: 'x',
        checkType: 'null',
        operator: '==='
      });
    });

    it('should detect !== null checks', () => {
      const code = 'if (x !== null) { }';
      const result = extractTypeInference(code);
      expect(result.nullChecks[0].operator).toBe('!==');
    });

    it('should detect === undefined checks', () => {
      const code = 'if (x === undefined) { }';
      const result = extractTypeInference(code);
      expect(result.nullChecks[0].checkType).toBe('undefined');
    });

    it('should detect !== undefined checks', () => {
      const code = 'if (x !== undefined) { }';
      const result = extractTypeInference(code);
      expect(result.nullChecks[0]).toMatchObject({
        variable: 'x',
        checkType: 'undefined',
        operator: '!=='
      });
    });

    it('should detect == null checks', () => {
      const code = 'if (x == null) { }';
      const result = extractTypeInference(code);
      expect(result.nullChecks[0].operator).toBe('==');
    });
  });

  describe('all array', () => {
    it('should combine all type information', () => {
      const code = `
        if (typeof x === "string") { }
        /** @param {number} y */
        const z = param || [];
      `;
      const result = extractTypeInference(code);
      expect(result.all.length).toBeGreaterThanOrEqual(2);
    });

    it('should categorize items correctly', () => {
      const code = `
        if (typeof x === "string") { }
        if (obj instanceof Date) { }
        /** @param {number} y */
        if (z === null) { }
      `;
      const result = extractTypeInference(code);
      const categories = result.all.map(item => item.category);
      expect(categories).toContain('typeof');
      expect(categories).toContain('instanceof');
      expect(categories).toContain('jsdoc');
      expect(categories).toContain('null_check');
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      const result = extractTypeInference('');
      expect(result.typeofChecks).toHaveLength(0);
      expect(result.instanceofChecks).toHaveLength(0);
      expect(result.defaultValues).toHaveLength(0);
      expect(result.jsdocTypes).toHaveLength(0);
      expect(result.nullChecks).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });

    it('should handle code without type information', () => {
      const code = 'function simple(x) { return x; }';
      const result = extractTypeInference(code);
      expect(result.all).toHaveLength(0);
    });

    it('should handle complex type patterns', () => {
      const code = `
        /**
         * @param {Object} options
         * @param {string} options.name
         * @param {number} [options.count]
         */
        function process(options) {
          if (typeof options !== 'object') return;
          if (options instanceof Array) return;
          const count = options.count || 0;
          if (count === null) return;
          return count;
        }
      `;
      const result = extractTypeInference(code);
      expect(result.all.length).toBeGreaterThan(0);
    });
  });
});

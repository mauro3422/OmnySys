/**
 * @fileoverview Tests for Parser Config
 * 
 * Tests the parser configuration module including:
 * - Babel plugin selection
 * - Parser options generation
 * - TypeScript and JSX support
 */

import { describe, it, expect } from 'vitest';
import { getBabelPlugins, getParserOptions } from '#layer-a/parser/config.js';
import { CodeSampleBuilder } from '../../../factories/parser-test.factory.js';

describe('ParserConfig', () => {
  describe('Structure Contract', () => {
    it('MUST export getBabelPlugins function', () => {
      expect(getBabelPlugins).toBeTypeOf('function');
    });

    it('MUST export getParserOptions function', () => {
      expect(getParserOptions).toBeTypeOf('function');
    });

    it('getBabelPlugins MUST return an array', () => {
      const plugins = getBabelPlugins('test.js');
      expect(Array.isArray(plugins)).toBe(true);
    });

    it('getParserOptions MUST return an object', () => {
      const options = getParserOptions('test.js');
      expect(options).toBeTypeOf('object');
    });

    it('parser options MUST have required fields', () => {
      const options = getParserOptions('test.js');
      expect(options).toHaveProperty('sourceType');
      expect(options).toHaveProperty('allowImportExportEverywhere');
      expect(options).toHaveProperty('allowReturnOutsideFunction');
      expect(options).toHaveProperty('plugins');
    });

    it('parser options MUST have correct default values', () => {
      const options = getParserOptions('test.js');
      expect(options.sourceType).toBe('module');
      expect(options.allowImportExportEverywhere).toBe(true);
      expect(options.allowReturnOutsideFunction).toBe(true);
    });
  });

  describe('Plugin Selection', () => {
    it('MUST include common plugins for JavaScript files', () => {
      const plugins = getBabelPlugins('test.js');
      expect(plugins).toContain('jsx');
      expect(plugins).toContain('objectRestSpread');
      expect(plugins).toContain('decorators');
      expect(plugins).toContain('classProperties');
    });

    it('MUST include TypeScript plugin for .ts files', () => {
      const plugins = getBabelPlugins('test.ts');
      const hasTypeScript = plugins.some(p => 
        Array.isArray(p) && p[0] === 'typescript'
      );
      expect(hasTypeScript).toBe(true);
    });

    it('MUST include TypeScript plugin for .tsx files', () => {
      const plugins = getBabelPlugins('test.tsx');
      const hasTypeScript = plugins.some(p => 
        Array.isArray(p) && p[0] === 'typescript'
      );
      expect(hasTypeScript).toBe(true);
    });

    it('MUST include Flow plugin for .js files', () => {
      const plugins = getBabelPlugins('test.js');
      const hasFlow = plugins.some(p => 
        Array.isArray(p) && p[0] === 'flow'
      );
      expect(hasFlow).toBe(true);
    });

    it('MUST NOT include Flow plugin for TypeScript files', () => {
      const plugins = getBabelPlugins('test.ts');
      const hasFlow = plugins.some(p => 
        Array.isArray(p) && p[0] === 'flow'
      );
      expect(hasFlow).toBe(false);
    });

    it('MUST configure TypeScript plugin with isTSX for .tsx files', () => {
      const plugins = getBabelPlugins('test.tsx');
      const tsPlugin = plugins.find(p => 
        Array.isArray(p) && p[0] === 'typescript'
      );
      expect(tsPlugin).toBeDefined();
      expect(tsPlugin[1]).toHaveProperty('isTSX', true);
    });

    it('MUST include pipeline operator plugin', () => {
      const plugins = getBabelPlugins('test.js');
      const hasPipeline = plugins.some(p => 
        Array.isArray(p) && p[0] === 'pipelineOperator'
      );
      expect(hasPipeline).toBe(true);
    });

    it('MUST include optional chaining plugin', () => {
      const plugins = getBabelPlugins('test.js');
      expect(plugins).toContain('optionalChaining');
    });

    it('MUST include nullish coalescing operator plugin', () => {
      const plugins = getBabelPlugins('test.js');
      expect(plugins).toContain('nullishCoalescingOperator');
    });
  });

  describe('Error Handling Contract', () => {
    it('MUST handle empty string file path', () => {
      const plugins = getBabelPlugins('');
      expect(Array.isArray(plugins)).toBe(true);
    });

    it('MUST handle null file path gracefully', () => {
      expect(() => getBabelPlugins(null)).not.toThrow();
    });

    it('MUST handle undefined file path gracefully', () => {
      expect(() => getBabelPlugins(undefined)).not.toThrow();
    });

    it('MUST handle file paths without extension', () => {
      const plugins = getBabelPlugins('Makefile');
      expect(Array.isArray(plugins)).toBe(true);
    });

    it('MUST return valid plugins for edge case file names', () => {
      const plugins = getBabelPlugins('file.with.dots.js');
      expect(plugins).toContain('jsx');
    });

    it('parser options MUST include plugins array', () => {
      const options = getParserOptions('test.js');
      expect(Array.isArray(options.plugins)).toBe(true);
    });
  });

  describe('TypeScript Support', () => {
    it('MUST support .ts extension', () => {
      const options = getParserOptions('test.ts');
      const hasTypeScript = options.plugins.some(p => 
        Array.isArray(p) && p[0] === 'typescript'
      );
      expect(hasTypeScript).toBe(true);
    });

    it('MUST support .tsx extension', () => {
      const options = getParserOptions('test.tsx');
      const hasTypeScript = options.plugins.some(p => 
        Array.isArray(p) && p[0] === 'typescript'
      );
      expect(hasTypeScript).toBe(true);
    });

    it('MUST configure isTSX correctly for TSX files', () => {
      const options = getParserOptions('component.tsx');
      const tsPlugin = options.plugins.find(p => 
        Array.isArray(p) && p[0] === 'typescript'
      );
      expect(tsPlugin[1].isTSX).toBe(true);
    });

    it('MUST configure isTSX as false for TS files', () => {
      const options = getParserOptions('types.ts');
      const tsPlugin = options.plugins.find(p => 
        Array.isArray(p) && p[0] === 'typescript'
      );
      expect(tsPlugin[1].isTSX).toBe(false);
    });
  });

  describe('JSX Support', () => {
    it('MUST include jsx plugin for .jsx files', () => {
      const plugins = getBabelPlugins('test.jsx');
      expect(plugins).toContain('jsx');
    });

    it('MUST include jsx plugin for .tsx files', () => {
      const plugins = getBabelPlugins('test.tsx');
      expect(plugins).toContain('jsx');
    });
  });
});

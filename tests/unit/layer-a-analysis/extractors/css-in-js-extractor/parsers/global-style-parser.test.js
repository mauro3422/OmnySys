/**
 * @fileoverview global-style-parser.test.js
 * 
 * Tests for Global Style Parser
 * Tests parseGlobalStyles
 * 
 * @module tests/unit/layer-a-analysis/extractors/css-in-js-extractor/parsers/global-style-parser
 */

import { describe, it, expect } from 'vitest';
import { parseGlobalStyles } from '#layer-a/extractors/css-in-js-extractor/parsers/global-style-parser.js';
import {
  GlobalStyleBuilder,
  CSSInJSScenarios
} from '../../../../../factories/css-in-js-test.factory.js';

describe('Global Style Parser', () => {
  describe('parseGlobalStyles', () => {
    it('should parse createGlobalStyle', () => {
      const code = `
        import { createGlobalStyle } from 'styled-components';
        const GlobalStyle = createGlobalStyle\`
          body {
            margin: 0;
            padding: 0;
          }
        \`;
      `;

      const result = parseGlobalStyles(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('global_style');
    });

    it('should parse multiple global styles', () => {
      const code = `
        const GlobalReset = createGlobalStyle\`
          * { box-sizing: border-box; }
        \`;
        const Typography = createGlobalStyle\`
          body { font-family: Arial; }
        \`;
      `;

      const result = parseGlobalStyles(code);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should include CSS content', () => {
      const code = `
        const GlobalStyle = createGlobalStyle\`
          body {
            margin: 0;
            padding: 0;
          }
        \`;
      `;

      const result = parseGlobalStyles(code);

      expect(typeof result[0].css).toBe('string');
      expect(result[0].css).toContain('body');
    });

    it('should include line numbers', () => {
      const code = `
        const GlobalStyle = createGlobalStyle\`
          body { margin: 0; }
        \`;
      `;

      const result = parseGlobalStyles(code);

      expect(typeof result[0].line).toBe('number');
      expect(result[0].line).toBeGreaterThanOrEqual(1);
    });

    it('should handle CSS reset', () => {
      const code = `
        const CSSReset = createGlobalStyle\`
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
        \`;
      `;

      const result = parseGlobalStyles(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].css).toContain('box-sizing');
    });

    it('should handle typography styles', () => {
      const code = `
        const Typography = createGlobalStyle\`
          h1, h2, h3 {
            font-weight: 600;
            line-height: 1.2;
          }
        \`;
      `;

      const result = parseGlobalStyles(code);

      expect(result[0].css).toContain('font-weight');
    });

    it('should return empty array for no matches', () => {
      const code = `
        const x = 1;
        function test() { return 'not styled'; }
      `;

      const result = parseGlobalStyles(code);

      expect(result).toEqual([]);
    });

    it('should handle empty string', () => {
      const result = parseGlobalStyles('');

      expect(result).toEqual([]);
    });

    it('should handle code with only comments', () => {
      const code = `
        // This should not match
        /* createGlobalStyle is a styled-components feature */
      `;

      const result = parseGlobalStyles(code);

      expect(result).toEqual([]);
    });
  });

  describe('Integration with factories', () => {
    it('should work with GlobalStyleBuilder', () => {
      const builder = new GlobalStyleBuilder();
      builder.withGlobalStyleImport()
        .withGlobalStyle('GlobalStyle', 'body { margin: 0; }')
        .withCSSReset()
        .withTypographyGlobal();
      const { code } = builder.build();

      const result = parseGlobalStyles(code);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should work with globalStylesOnly scenario', () => {
      const scenario = CSSInJSScenarios.globalStylesOnly();

      const result = parseGlobalStyles(scenario.code);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error handling', () => {
    it('should handle null input', () => {
      expect(() => parseGlobalStyles(null)).not.toThrow();
    });

    it('should handle undefined input', () => {
      expect(() => parseGlobalStyles(undefined)).not.toThrow();
    });

    it('should return empty array for null/undefined', () => {
      expect(parseGlobalStyles(null)).toEqual([]);
      expect(parseGlobalStyles(undefined)).toEqual([]);
    });
  });
});

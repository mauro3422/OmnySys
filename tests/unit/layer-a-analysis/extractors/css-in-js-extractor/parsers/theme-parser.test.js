/**
 * @fileoverview theme-parser.test.js
 * 
 * Tests for Theme Parser
 * Tests parseThemeProviders, parseUseTheme, parseWithTheme, parseThemeAccess
 * 
 * @module tests/unit/layer-a-analysis/extractors/css-in-js-extractor/parsers/theme-parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseThemeProviders,
  parseUseTheme,
  parseWithTheme,
  parseThemeAccess
} from '#layer-a/extractors/css-in-js-extractor/parsers/theme-parser.js';
import {
  ThemeBuilder,
  CSSInJSScenarios
} from '../../../../../factories/css-in-js-test.factory.js';

describe('Theme Parser', () => {
  describe('parseThemeProviders', () => {
    it('should parse ThemeProvider with theme prop', () => {
      const code = `
        import { ThemeProvider } from 'styled-components';
        const App = () => (
          <ThemeProvider theme={theme}>
            <Child />
          </ThemeProvider>
        );
      `;

      const result = parseThemeProviders(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('theme_provider');
      expect(result[0].themeVar).toBe('theme');
    });

    it('should parse multiple ThemeProviders', () => {
      const code = `
        <ThemeProvider theme={lightTheme}><App /></ThemeProvider>
        <ThemeProvider theme={darkTheme}><Other /></ThemeProvider>
      `;

      const result = parseThemeProviders(code);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should include line numbers', () => {
      const code = `
        <ThemeProvider theme={theme}>
          <App />
        </ThemeProvider>
      `;

      const result = parseThemeProviders(code);

      expect(typeof result[0].line).toBe('number');
      expect(result[0].line).toBeGreaterThanOrEqual(1);
    });

    it('should handle different theme variable names', () => {
      const code = `
        <ThemeProvider theme={appTheme} />
        <ThemeProvider theme={lightTheme} />
        <ThemeProvider theme={customTheme} />
      `;

      const result = parseThemeProviders(code);

      const themeVars = result.map(r => r.themeVar);
      expect(themeVars).toContain('appTheme');
      expect(themeVars).toContain('lightTheme');
      expect(themeVars).toContain('customTheme');
    });

    it('should return empty array for no matches', () => {
      const code = 'const x = 1;';

      const result = parseThemeProviders(code);

      expect(result).toEqual([]);
    });

    it('should handle empty string', () => {
      const result = parseThemeProviders('');

      expect(result).toEqual([]);
    });
  });

  describe('parseUseTheme', () => {
    it('should parse useTheme() hook', () => {
      const code = `
        import { useTheme } from 'styled-components';
        const theme = useTheme();
      `;

      const result = parseUseTheme(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('use_theme');
    });

    it('should parse multiple useTheme calls', () => {
      const code = `
        const theme1 = useTheme();
        const theme2 = useTheme();
      `;

      const result = parseUseTheme(code);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should include line numbers', () => {
      const code = `
        const theme = useTheme();
      `;

      const result = parseUseTheme(code);

      expect(typeof result[0].line).toBe('number');
    });

    it('should return empty array for no matches', () => {
      const code = 'const x = 1;';

      const result = parseUseTheme(code);

      expect(result).toEqual([]);
    });
  });

  describe('parseWithTheme', () => {
    it('should parse withTheme HOC', () => {
      const code = `
        import { withTheme } from 'styled-components';
        const ThemedComponent = withTheme(MyComponent);
      `;

      const result = parseWithTheme(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('with_theme');
      expect(result[0].component).toBe('MyComponent');
    });

    it('should parse multiple withTheme usages', () => {
      const code = `
        const ThemedButton = withTheme(Button);
        const ThemedInput = withTheme(Input);
      `;

      const result = parseWithTheme(code);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should include line numbers', () => {
      const code = `
        const Themed = withTheme(Component);
      `;

      const result = parseWithTheme(code);

      expect(typeof result[0].line).toBe('number');
    });

    it('should return empty array for no matches', () => {
      const code = 'const x = 1;';

      const result = parseWithTheme(code);

      expect(result).toEqual([]);
    });
  });

  describe('parseThemeAccess', () => {
    it('should parse theme.xxx access', () => {
      const code = `
        const color = theme.colors.primary;
      `;

      const result = parseThemeAccess(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('theme_access');
      expect(result[0].path).toBe('colors.primary');
    });

    it('should parse props.theme.xxx access', () => {
      const code = `
        const color = props.theme.colors.secondary;
      `;

      const result = parseThemeAccess(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].path).toContain('colors');
    });

    it('should parse multiple theme accesses', () => {
      const code = `
        const primary = theme.colors.primary;
        const spacing = theme.spacing.medium;
        const font = theme.fonts.main;
      `;

      const result = parseThemeAccess(code);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should include line numbers', () => {
      const code = `
        const color = theme.colors.primary;
      `;

      const result = parseThemeAccess(code);

      expect(typeof result[0].line).toBe('number');
    });

    it('should handle nested paths', () => {
      const code = `
        const color = theme.colors.palette.primary.main;
      `;

      const result = parseThemeAccess(code);

      expect(result[0].path).toContain('palette');
      expect(result[0].path).toContain('primary');
    });

    it('should return empty array for no matches', () => {
      const code = 'const x = 1;';

      const result = parseThemeAccess(code);

      expect(result).toEqual([]);
    });
  });

  describe('Integration with factories', () => {
    it('should work with ThemeBuilder', () => {
      const builder = new ThemeBuilder();
      builder.withStyledImport()
        .withThemeObject('theme')
        .withThemeProvider('theme')
        .withUseTheme('currentTheme')
        .withWithTheme('MyComponent', 'ThemedComponent')
        .withThemeAccess('colors.primary', 'primaryColor');
      const { code } = builder.build();

      const providers = parseThemeProviders(code);
      const useThemes = parseUseTheme(code);
      const withThemes = parseWithTheme(code);
      const accesses = parseThemeAccess(code);

      expect(providers.length).toBeGreaterThanOrEqual(1);
      expect(useThemes.length).toBeGreaterThanOrEqual(1);
      expect(withThemes.length).toBeGreaterThanOrEqual(1);
      expect(accesses.length).toBeGreaterThanOrEqual(1);
    });

    it('should work with complexTheme scenario', () => {
      const scenario = CSSInJSScenarios.complexTheme();

      const providers = parseThemeProviders(scenario.code);
      const useThemes = parseUseTheme(scenario.code);
      const accesses = parseThemeAccess(scenario.code);

      expect(providers.length + useThemes.length + accesses.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle null input', () => {
      expect(() => parseThemeProviders(null)).not.toThrow();
      expect(() => parseUseTheme(null)).not.toThrow();
      expect(() => parseWithTheme(null)).not.toThrow();
      expect(() => parseThemeAccess(null)).not.toThrow();
    });

    it('should handle undefined input', () => {
      expect(() => parseThemeProviders(undefined)).not.toThrow();
      expect(() => parseUseTheme(undefined)).not.toThrow();
      expect(() => parseWithTheme(undefined)).not.toThrow();
      expect(() => parseThemeAccess(undefined)).not.toThrow();
    });

    it('should return empty array for null/undefined', () => {
      expect(parseThemeProviders(null)).toEqual([]);
      expect(parseUseTheme(null)).toEqual([]);
      expect(parseWithTheme(null)).toEqual([]);
      expect(parseThemeAccess(null)).toEqual([]);
    });
  });
});

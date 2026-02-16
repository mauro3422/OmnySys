/**
 * @fileoverview CSS-in-JS Contract Tests
 * 
 * Contract tests for all CSS-in-JS extractors
 * Ensures consistent interfaces and result structures across all extractors
 * 
 * @module tests/unit/layer-a-analysis/extractors/css-in-js-extractor/contract
 */

import { describe, it, expect } from 'vitest';
import {
  parseStyledTags,
  parseStyledStrings,
  parseStyledComponents,
  parseCSSProps
} from '#layer-a/extractors/css-in-js-extractor/parsers/styled-parser.js';
import {
  parseThemeProviders,
  parseUseTheme,
  parseWithTheme,
  parseThemeAccess
} from '#layer-a/extractors/css-in-js-extractor/parsers/theme-parser.js';
import { parseGlobalStyles } from '#layer-a/extractors/css-in-js-extractor/parsers/global-style-parser.js';
import {
  detectStyledComponentConnections
} from '#layer-a/extractors/css-in-js-extractor/detectors/styled-connections.js';
import {
  detectThemeConnections
} from '#layer-a/extractors/css-in-js-extractor/detectors/theme-connections.js';
import {
  extractStyledComponents,
  extractCSSInJSFromFile,
  detectAllCSSInJSConnections
} from '#layer-a/extractors/css-in-js-extractor/index.js';
import {
  CSSInJSScenarios,
  CSSInJSValidators,
  StyledComponentBuilder,
  ThemeBuilder,
  GlobalStyleBuilder
} from '../../../../factories/css-in-js-test.factory.js';

describe('CSS-in-JS Contract', () => {
  const FILE_PATH = 'test/components/Button.jsx';

  // ============================================================================
  // Parser Contract
  // ============================================================================
  describe('Parser Contract', () => {
    it('all parsers must return arrays', () => {
      const code = 'const x = 1;';

      expect(Array.isArray(parseStyledTags(code))).toBe(true);
      expect(Array.isArray(parseStyledStrings(code))).toBe(true);
      expect(Array.isArray(parseStyledComponents(code))).toBe(true);
      expect(Array.isArray(parseCSSProps(code))).toBe(true);
      expect(Array.isArray(parseThemeProviders(code))).toBe(true);
      expect(Array.isArray(parseUseTheme(code))).toBe(true);
      expect(Array.isArray(parseWithTheme(code))).toBe(true);
      expect(Array.isArray(parseThemeAccess(code))).toBe(true);
      expect(Array.isArray(parseGlobalStyles(code))).toBe(true);
    });

    it('all parsers must return empty array for empty code', () => {
      expect(parseStyledTags('')).toEqual([]);
      expect(parseStyledStrings('')).toEqual([]);
      expect(parseStyledComponents('')).toEqual([]);
      expect(parseCSSProps('')).toEqual([]);
      expect(parseThemeProviders('')).toEqual([]);
      expect(parseUseTheme('')).toEqual([]);
      expect(parseWithTheme('')).toEqual([]);
      expect(parseThemeAccess('')).toEqual([]);
      expect(parseGlobalStyles('')).toEqual([]);
    });

    it('all parser results must include line numbers', () => {
      const code = `
        const Button = styled.button\`color: blue;\`;
        const theme = useTheme();
        const GlobalStyle = createGlobalStyle\`body { margin: 0; }\`;
      `;

      const styledTags = parseStyledTags(code);
      const useThemes = parseUseTheme(code);
      const globalStyles = parseGlobalStyles(code);

      [...styledTags, ...useThemes, ...globalStyles].forEach(item => {
        expect(typeof item.line).toBe('number');
        expect(item.line).toBeGreaterThanOrEqual(1);
      });
    });

    it('all parser results must include type field', () => {
      const code = `
        const Button = styled.button\`color: blue;\`;
        const theme = useTheme();
        <ThemeProvider theme={theme} />;
        const GlobalStyle = createGlobalStyle\`body { margin: 0; }\`;
      `;

      const styledTags = parseStyledTags(code);
      const useThemes = parseUseTheme(code);
      const themeProviders = parseThemeProviders(code);
      const globalStyles = parseGlobalStyles(code);

      [...styledTags, ...useThemes, ...themeProviders, ...globalStyles].forEach(item => {
        expect(typeof item.type).toBe('string');
        expect(item.type.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // Styled Component Extraction Contract
  // ============================================================================
  describe('Styled Component Extraction Contract', () => {
    it('extractStyledComponents must return required fields', () => {
      const result = extractStyledComponents('');

      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('themes');
      expect(result).toHaveProperty('globalStyles');
      expect(result).toHaveProperty('all');
    });

    it('extractStyledComponents must return arrays for all fields', () => {
      const result = extractStyledComponents('');

      expect(Array.isArray(result.components)).toBe(true);
      expect(Array.isArray(result.themes)).toBe(true);
      expect(Array.isArray(result.globalStyles)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('all array must be union of components, themes, and globalStyles', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withStyledTag('div', 'color: red;', 'RedDiv');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.all.length).toBe(
        result.components.length + 
        result.themes.length + 
        result.globalStyles.length
      );
    });
  });

  // ============================================================================
  // File Analysis Contract
  // ============================================================================
  describe('File Analysis Contract', () => {
    it('extractCSSInJSFromFile must return complete file analysis', () => {
      const result = extractCSSInJSFromFile(FILE_PATH, '');

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('themes');
      expect(result).toHaveProperty('globalStyles');
      expect(result).toHaveProperty('all');
      expect(result).toHaveProperty('timestamp');
    });

    it('extractCSSInJSFromFile must include correct file path', () => {
      const result = extractCSSInJSFromFile(FILE_PATH, '');

      expect(result.filePath).toBe(FILE_PATH);
    });

    it('extractCSSInJSFromFile must include valid ISO timestamp', () => {
      const result = extractCSSInJSFromFile(FILE_PATH, '');

      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  // ============================================================================
  // Connection Detection Contract
  // ============================================================================
  describe('Connection Detection Contract', () => {
    it('detectStyledComponentConnections must return valid connections', () => {
      const fileResults = {
        'components/A.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        },
        'components/B.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        }
      };

      const result = detectStyledComponentConnections(fileResults);

      result.forEach(conn => {
        expect(CSSInJSValidators.isValidConnection(conn)).toBe(true);
      });
    });

    it('detectThemeConnections must return valid connections', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Consumer.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      result.forEach(conn => {
        expect(CSSInJSValidators.isValidConnection(conn)).toBe(true);
      });
    });

    it('detectAllCSSInJSConnections must categorize connections', () => {
      const files = {
        'theme/Provider.jsx': `
          <ThemeProvider theme={theme} />
        `,
        'components/Consumer.jsx': `
          const theme = useTheme();
        `,
        'components/Extension.jsx': `
          const Extended = styled(Base)\`color: red;\`;
        `
      };

      const result = detectAllCSSInJSConnections(files);

      expect(result).toHaveProperty('byType');
      expect(result.byType).toHaveProperty('theme');
      expect(result.byType).toHaveProperty('styledExtension');
    });

    it('connections must have required fields', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Consumer.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      result.forEach(conn => {
        expect(conn).toHaveProperty('id');
        expect(conn).toHaveProperty('sourceFile');
        expect(conn).toHaveProperty('targetFile');
        expect(conn).toHaveProperty('type');
        expect(conn).toHaveProperty('via');
        expect(conn).toHaveProperty('confidence');
        expect(conn).toHaveProperty('detectedBy');
        expect(conn).toHaveProperty('reason');
      });
    });

    it('connection confidence must be between 0 and 1', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Consumer.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        }
      };

      const result = detectThemeConnections(fileResults);

      result.forEach(conn => {
        expect(typeof conn.confidence).toBe('number');
        expect(conn.confidence).toBeGreaterThanOrEqual(0);
        expect(conn.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('all parsers must handle null input', () => {
      expect(() => parseStyledTags(null)).not.toThrow();
      expect(() => parseStyledStrings(null)).not.toThrow();
      expect(() => parseStyledComponents(null)).not.toThrow();
      expect(() => parseCSSProps(null)).not.toThrow();
      expect(() => parseThemeProviders(null)).not.toThrow();
      expect(() => parseUseTheme(null)).not.toThrow();
      expect(() => parseWithTheme(null)).not.toThrow();
      expect(() => parseThemeAccess(null)).not.toThrow();
      expect(() => parseGlobalStyles(null)).not.toThrow();
    });

    it('all parsers must handle undefined input', () => {
      expect(() => parseStyledTags(undefined)).not.toThrow();
      expect(() => parseStyledStrings(undefined)).not.toThrow();
      expect(() => parseStyledComponents(undefined)).not.toThrow();
      expect(() => parseCSSProps(undefined)).not.toThrow();
      expect(() => parseThemeProviders(undefined)).not.toThrow();
      expect(() => parseUseTheme(undefined)).not.toThrow();
      expect(() => parseWithTheme(undefined)).not.toThrow();
      expect(() => parseThemeAccess(undefined)).not.toThrow();
      expect(() => parseGlobalStyles(undefined)).not.toThrow();
    });

    it('facade must handle null/undefined code', () => {
      expect(() => extractStyledComponents(null)).not.toThrow();
      expect(() => extractStyledComponents(undefined)).not.toThrow();
      expect(() => extractCSSInJSFromFile(FILE_PATH, null)).not.toThrow();
    });

    it('connection detectors must handle null/undefined', () => {
      expect(() => detectStyledComponentConnections(null)).not.toThrow();
      expect(() => detectStyledComponentConnections(undefined)).not.toThrow();
      expect(() => detectThemeConnections(null)).not.toThrow();
      expect(() => detectThemeConnections(undefined)).not.toThrow();
      expect(() => detectAllCSSInJSConnections(null)).not.toThrow();
      expect(() => detectAllCSSInJSConnections(undefined)).not.toThrow();
    });

    it('should handle whitespace-only code', () => {
      const code = '   \n\t   ';

      const result = extractStyledComponents(code);

      expect(result.all).toHaveLength(0);
    });

    it('should handle code with only comments', () => {
      const code = `
        // styled-components comment
        /* ThemeProvider usage */
      `;

      const result = extractStyledComponents(code);

      expect(result.all).toHaveLength(0);
    });

    it('should handle very large files', () => {
      const code = 'const Button = styled.button\`color: blue;\`;\n'.repeat(1000);

      expect(() => extractStyledComponents(code)).not.toThrow();
    });

    it('should handle special characters in code', () => {
      const code = `
        const Button = styled.button\`
          content: '🎉';
          font-family: 'Arial';
        \`;
      `;

      expect(() => extractStyledComponents(code)).not.toThrow();
    });
  });

  // ============================================================================
  // Type Consistency Contract
  // ============================================================================
  describe('Type Consistency Contract', () => {
    it('styled component types must be consistent', () => {
      const code = `
        const A = styled.div\`\`;
        const B = styled('span')\`\`;
        const C = styled(Component)\`\`;
      `;

      const result = extractStyledComponents(code);

      const types = new Set(result.components.map(c => c.type));
      expect(types.has('styled_tag')).toBe(true);
      expect(types.has('styled_string')).toBe(true);
      expect(types.has('styled_component')).toBe(true);
    });

    it('theme types must be consistent', () => {
      const code = `
        <ThemeProvider theme={theme} />;
        const t = useTheme();
        const T = withTheme(Component);
        const c = theme.colors.primary;
      `;

      const result = extractStyledComponents(code);

      const types = new Set(result.themes.map(t => t.type));
      expect(types.has('theme_provider')).toBe(true);
      expect(types.has('use_theme')).toBe(true);
      expect(types.has('with_theme')).toBe(true);
      expect(types.has('theme_access')).toBe(true);
    });

    it('connection types must be valid', () => {
      const fileResults = {
        'theme/Provider.jsx': {
          themes: [
            { type: 'theme_provider', themeVar: 'theme', line: 1 }
          ]
        },
        'components/Consumer.jsx': {
          themes: [
            { type: 'use_theme', line: 1 }
          ]
        },
        'components/A.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        },
        'components/B.jsx': {
          components: [
            { type: 'styled_component', baseComponent: 'Base', line: 1 }
          ]
        }
      };

      const themeConns = detectThemeConnections(fileResults);
      const styledConns = detectStyledComponentConnections(fileResults);

      themeConns.forEach(conn => {
        expect(conn.type).toBe('sharedTheme');
      });

      styledConns.forEach(conn => {
        expect(conn.type).toBe('styledExtension');
      });
    });
  });

  // ============================================================================
  // Factory Integration Contract
  // ============================================================================
  describe('Factory Integration Contract', () => {
    it('all factories must produce valid code', () => {
      const styledBuilder = new StyledComponentBuilder();
      styledBuilder.withStyledImport().withStyledTag('div', 'color: red;', 'RedDiv');
      
      const themeBuilder = new ThemeBuilder();
      themeBuilder.withStyledImport().withThemeObject('theme').withThemeProvider('theme');
      
      const globalBuilder = new GlobalStyleBuilder();
      globalBuilder.withGlobalStyleImport().withGlobalStyle('GlobalStyle', 'body { margin: 0; }');

      expect(typeof styledBuilder.build().code).toBe('string');
      expect(typeof themeBuilder.build().code).toBe('string');
      expect(typeof globalBuilder.build().code).toBe('string');
    });

    it('all scenarios must produce valid code', () => {
      const scenarios = [
        CSSInJSScenarios.simpleStyledComponent(),
        CSSInJSScenarios.multipleStyledComponents(),
        CSSInJSScenarios.themedStyledComponent(),
        CSSInJSScenarios.globalStylesOnly(),
        CSSInJSScenarios.complexTheme()
      ];

      scenarios.forEach(scenario => {
        expect(typeof scenario.code).toBe('string');
        const result = extractStyledComponents(scenario.code);
        expect(Array.isArray(result.all)).toBe(true);
      });
    });

    it('validators must work with actual results', () => {
      const scenario = CSSInJSScenarios.multipleStyledComponents();
      const result = extractStyledComponents(scenario.code);

      result.components.forEach(comp => {
        expect(CSSInJSValidators.isValidStyledComponent(comp)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Performance Contract
  // ============================================================================
  describe('Performance Contract', () => {
    it('should analyze small files quickly', () => {
      const code = 'const Button = styled.button\`color: blue;\`;\n'.repeat(10);
      const start = Date.now();

      extractStyledComponents(code);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should scale linearly with file size', () => {
      const smallCode = 'const x = styled.div\`\`;\n'.repeat(100);
      const largeCode = 'const x = styled.div\`\`;\n'.repeat(1000);

      const start1 = Date.now();
      extractStyledComponents(smallCode);
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      extractStyledComponents(largeCode);
      const duration2 = Date.now() - start2;

      expect(duration2).toBeLessThan(duration1 * 15);
    });
  });
});

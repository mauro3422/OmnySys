/**
 * @fileoverview index.test.js
 * 
 * Tests for CSS-in-JS Extractor Facade
 * Tests extractStyledComponents, extractCSSInJSFromFile, detectAllCSSInJSConnections
 * 
 * @module tests/unit/layer-a-analysis/extractors/css-in-js-extractor/index
 */

import { describe, it, expect } from 'vitest';
import {
  extractStyledComponents,
  extractCSSInJSFromFile,
  detectAllCSSInJSConnections,
  detectThemeConnections,
  detectStyledComponentConnections
} from '#layer-a/extractors/css-in-js-extractor/index.js';
import {
  StyledComponentBuilder,
  ThemeBuilder,
  GlobalStyleBuilder,
  CSSInJSConnectionBuilder,
  CSSInJSScenarios,
  CSSInJSValidators
} from '../../../../factories/css-in-js-test.factory.js';

describe('CSS-in-JS Extractor Facade (index)', () => {
  const FILE_PATH = 'test/components/Button.jsx';

  describe('extractStyledComponents', () => {
    it('should extract styled tag components: styled.div`...`', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withStyledTag('div', 'color: red;', 'RedDiv');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.components.length).toBeGreaterThanOrEqual(1);
      expect(result.components.some(c => c.type === 'styled_tag')).toBe(true);
    });

    it('should extract styled string components: styled("div")`...`', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withStyledString('span', 'font-size: 14px;', 'StyledSpan');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.components.some(c => c.type === 'styled_string')).toBe(true);
    });

    it('should extract styled component wrappers: styled(Component)`...`', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withStyledComponent('Button', 'background: blue;', 'StyledButton');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.components.some(c => c.type === 'styled_component')).toBe(true);
    });

    it('should extract CSS props: css={`...`}', () => {
      const builder = new StyledComponentBuilder();
      builder.withCSSProp('color: green;');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.components.some(c => c.type === 'css_prop')).toBe(true);
    });

    it('should extract theme providers', () => {
      const builder = new ThemeBuilder();
      builder.withStyledImport()
        .withThemeObject('theme')
        .withThemeProvider('theme');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.themes.some(t => t.type === 'theme_provider')).toBe(true);
    });

    it('should extract useTheme hooks', () => {
      const builder = new ThemeBuilder();
      builder.withUseThemeImport()
        .withUseTheme('currentTheme');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.themes.some(t => t.type === 'use_theme')).toBe(true);
    });

    it('should extract withTheme HOC usage', () => {
      const builder = new ThemeBuilder();
      builder.withWithTheme('MyComponent', 'ThemedComponent');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.themes.some(t => t.type === 'with_theme')).toBe(true);
    });

    it('should extract theme access patterns', () => {
      const builder = new ThemeBuilder();
      builder.withPropsThemeAccess('colors.primary', 'ThemedDiv');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.themes.some(t => t.type === 'theme_access')).toBe(true);
    });

    it('should extract global styles', () => {
      const builder = new GlobalStyleBuilder();
      builder.withGlobalStyleImport()
        .withGlobalStyle('GlobalStyle', 'body { margin: 0; }');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.globalStyles.length).toBeGreaterThanOrEqual(1);
      expect(result.globalStyles.some(g => g.type === 'global_style')).toBe(true);
    });

    it('should return empty arrays for empty code', () => {
      const result = extractStyledComponents('');

      expect(result.components).toEqual([]);
      expect(result.themes).toEqual([]);
      expect(result.globalStyles).toEqual([]);
      expect(result.all).toEqual([]);
    });

    it('should return empty arrays for code without styled-components', () => {
      const code = `
        function regularFunction() {
          return 'not styled';
        }
      `;

      const result = extractStyledComponents(code);

      expect(result.components).toEqual([]);
      expect(result.themes).toEqual([]);
      expect(result.globalStyles).toEqual([]);
    });

    it('should include line numbers for all extracted items', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withStyledTag('div', 'color: red;', 'RedDiv')
        .withStyledTag('span', 'font-size: 14px;', 'Span');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      result.all.forEach(item => {
        expect(typeof item.line).toBe('number');
        expect(item.line).toBeGreaterThanOrEqual(1);
      });
    });

    it('should handle multiple styled components in one file', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withStyledTag('div', 'color: red;', 'RedDiv')
        .withStyledTag('span', 'font-size: 14px;', 'SmallSpan')
        .withStyledTag('button', 'background: blue;', 'BlueButton');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.components.length).toBeGreaterThanOrEqual(3);
    });

    it('should detect theme access in styled components', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withThemedStyled('div', 'colors.primary', 'ThemedDiv');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      const styledComponent = result.components.find(c => c.type === 'styled_tag');
      expect(styledComponent?.hasThemeAccess).toBe(true);
    });
  });

  describe('extractCSSInJSFromFile', () => {
    it('should return complete file analysis structure', () => {
      const result = extractCSSInJSFromFile(FILE_PATH, '');

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('themes');
      expect(result).toHaveProperty('globalStyles');
      expect(result).toHaveProperty('all');
      expect(result).toHaveProperty('timestamp');
    });

    it('should include file path in result', () => {
      const result = extractCSSInJSFromFile(FILE_PATH, '');

      expect(result.filePath).toBe(FILE_PATH);
    });

    it('should include ISO timestamp', () => {
      const result = extractCSSInJSFromFile(FILE_PATH, '');

      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('should include styled components in file analysis', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withStyledTag('button', 'padding: 10px;', 'Button');
      const { code } = builder.build();

      const result = extractCSSInJSFromFile(FILE_PATH, code);

      expect(result.components.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('detectAllCSSInJSConnections', () => {
    it('should detect theme provider -> consumer connections', () => {
      const files = {
        'theme/ThemeProvider.jsx': `
          import { ThemeProvider } from 'styled-components';
          const theme = { colors: { primary: '#000' } };
          const App = () => <ThemeProvider theme={theme}><Child /></ThemeProvider>;
        `,
        'components/ThemedButton.jsx': `
          import styled from 'styled-components';
          const Button = styled.button\`
            color: \${props => props.theme.colors.primary};
          \`;
        `
      };

      const result = detectAllCSSInJSConnections(files);

      expect(result).toHaveProperty('connections');
      expect(result).toHaveProperty('fileResults');
      expect(result).toHaveProperty('byType');
    });

    it('should categorize connections by type', () => {
      const files = {
        'components/Base.jsx': `
          import styled from 'styled-components';
          const Base = styled.div\`padding: 10px;\`;
        `,
        'components/Extended.jsx': `
          import styled from 'styled-components';
          import { Base } from './Base';
          const Extended = styled(Base)\`margin: 10px;\`;
        `
      };

      const result = detectAllCSSInJSConnections(files);

      expect(result.byType).toHaveProperty('theme');
      expect(result.byType).toHaveProperty('styledExtension');
      expect(Array.isArray(result.byType.theme)).toBe(true);
      expect(Array.isArray(result.byType.styledExtension)).toBe(true);
    });

    it('should return valid connection objects', () => {
      const builder = new CSSInJSConnectionBuilder();
      builder.withCSSInJSArchitecture();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllCSSInJSConnections(codeMap);

      result.connections.forEach(conn => {
        expect(CSSInJSValidators.isValidConnection(conn)).toBe(true);
      });
    });

    it('should handle empty file map', () => {
      const result = detectAllCSSInJSConnections({});

      expect(result.connections).toEqual([]);
      expect(result.fileResults).toEqual({});
    });

    it('should handle single file', () => {
      const files = {
        'components/Button.jsx': `
          import styled from 'styled-components';
          const Button = styled.button\`color: blue;\`;
        `
      };

      const result = detectAllCSSInJSConnections(files);

      expect(result.connections).toEqual([]);
      expect(result.fileResults).toHaveProperty('components/Button.jsx');
    });
  });

  describe('Error handling', () => {
    it('should handle null code gracefully', () => {
      expect(() => extractStyledComponents(null)).not.toThrow();
      const result = extractStyledComponents(null);
      expect(result.components).toEqual([]);
      expect(result.themes).toEqual([]);
    });

    it('should handle undefined code gracefully', () => {
      expect(() => extractStyledComponents(undefined)).not.toThrow();
      const result = extractStyledComponents(undefined);
      expect(result.components).toEqual([]);
    });

    it('should handle invalid syntax gracefully', () => {
      const invalidCode = 'styled.div{broken';
      
      expect(() => extractStyledComponents(invalidCode)).not.toThrow();
    });

    it('should handle whitespace-only code', () => {
      const result = extractStyledComponents('   \n\t   ');

      expect(result.all).toHaveLength(0);
    });

    it('should handle code with only comments', () => {
      const code = `
        // This is a comment
        /* Multi-line
           comment */
      `;
      const result = extractStyledComponents(code);

      expect(result.all).toHaveLength(0);
    });
  });

  describe('Factory pattern integration', () => {
    it('should work with StyledComponentBuilder', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withStyledTag('div', 'color: red;', 'RedDiv')
        .withStyledTag('span', 'font-size: 14px;', 'Span');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.components.length).toBeGreaterThanOrEqual(2);
    });

    it('should work with ThemeBuilder', () => {
      const builder = new ThemeBuilder();
      builder.withStyledImport()
        .withThemeObject('theme')
        .withThemeProvider('theme')
        .withUseTheme('currentTheme');
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.themes.length).toBeGreaterThanOrEqual(2);
    });

    it('should work with GlobalStyleBuilder', () => {
      const builder = new GlobalStyleBuilder();
      builder.withGlobalStyleImport()
        .withCSSReset()
        .withTypographyGlobal();
      const { code } = builder.build();

      const result = extractStyledComponents(code);

      expect(result.globalStyles.length).toBeGreaterThanOrEqual(2);
    });

    it('should work with CSSInJSScenarios', () => {
      const scenario = CSSInJSScenarios.multipleStyledComponents();

      const result = extractStyledComponents(scenario.code);

      expect(result.components.length).toBeGreaterThanOrEqual(3);
    });

    it('should work with complex theme scenario', () => {
      const scenario = CSSInJSScenarios.complexTheme();

      const result = extractStyledComponents(scenario.code);

      expect(result.themes.length).toBeGreaterThanOrEqual(2);
    });
  });
});

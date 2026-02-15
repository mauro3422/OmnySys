/**
 * @fileoverview styled-parser.test.js
 * 
 * Tests for Styled Parser
 * Tests parseStyledTags, parseStyledStrings, parseStyledComponents, parseCSSProps
 * 
 * @module tests/unit/layer-a-analysis/extractors/css-in-js-extractor/parsers/styled-parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseStyledTags,
  parseStyledStrings,
  parseStyledComponents,
  parseCSSProps
} from '#layer-a/extractors/css-in-js-extractor/parsers/styled-parser.js';
import {
  StyledComponentBuilder,
  CSSInJSScenarios
} from '../../../../../factories/css-in-js-test.factory.js';

describe('Styled Parser', () => {
  describe('parseStyledTags', () => {
    it('should parse styled.tag pattern', () => {
      const code = `
        import styled from 'styled-components';
        const Button = styled.button\`
          background: blue;
          color: white;
        \`;
      `;

      const result = parseStyledTags(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('styled_tag');
      expect(result[0].tag).toBe('button');
    });

    it('should parse multiple styled tags', () => {
      const code = `
        const Div = styled.div\`padding: 10px;\`;
        const Span = styled.span\`font-size: 12px;\`;
        const Button = styled.button\`border: none;\`;
      `;

      const result = parseStyledTags(code);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should include line numbers', () => {
      const code = `
        const First = styled.div\`color: red;\`;
        const Second = styled.span\`color: blue;\`;
      `;

      const result = parseStyledTags(code);

      result.forEach(item => {
        expect(typeof item.line).toBe('number');
        expect(item.line).toBeGreaterThanOrEqual(1);
      });
    });

    it('should include CSS content', () => {
      const code = `
        const Button = styled.button\`
          background: blue;
          color: white;
        \`;
      `;

      const result = parseStyledTags(code);

      expect(typeof result[0].css).toBe('string');
      expect(result[0].css).toContain('background');
    });

    it('should detect theme access in interpolations', () => {
      const code = `
        const Button = styled.button\`
          color: \${props => props.theme.colors.primary};
        \`;
      `;

      const result = parseStyledTags(code);

      expect(result[0].hasThemeAccess).toBe(true);
      expect(result[0].interpolations.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const code = 'const x = 1;';

      const result = parseStyledTags(code);

      expect(result).toEqual([]);
    });

    it('should handle empty string', () => {
      const result = parseStyledTags('');

      expect(result).toEqual([]);
    });
  });

  describe('parseStyledStrings', () => {
    it('should parse styled("tag") pattern', () => {
      const code = `
        const Span = styled('span')\`
          font-size: 14px;
        \`;
      `;

      const result = parseStyledStrings(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('styled_string');
      expect(result[0].tag).toBe('span');
    });

    it('should parse multiple styled strings', () => {
      const code = `
        const Div = styled('div')\`padding: 10px;\`;
        const Span = styled('span')\`font-size: 12px;\`;
      `;

      const result = parseStyledStrings(code);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should include line numbers', () => {
      const code = `
        const First = styled('div')\`color: red;\`;
      `;

      const result = parseStyledStrings(code);

      expect(typeof result[0].line).toBe('number');
    });

    it('should return empty array for no matches', () => {
      const code = 'const x = 1;';

      const result = parseStyledStrings(code);

      expect(result).toEqual([]);
    });
  });

  describe('parseStyledComponents', () => {
    it('should parse styled(Component) pattern', () => {
      const code = `
        const ExtendedButton = styled(Button)\`
          background: green;
        \`;
      `;

      const result = parseStyledComponents(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('styled_component');
      expect(result[0].baseComponent).toBe('Button');
    });

    it('should parse multiple component extensions', () => {
      const code = `
        const PrimaryButton = styled(BaseButton)\`background: blue;\`;
        const SecondaryButton = styled(BaseButton)\`background: gray;\`;
      `;

      const result = parseStyledComponents(code);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should include line numbers', () => {
      const code = `
        const Extended = styled(Base)\`color: red;\`;
      `;

      const result = parseStyledComponents(code);

      expect(typeof result[0].line).toBe('number');
    });

    it('should include CSS content', () => {
      const code = `
        const Extended = styled(Base)\`
          color: red;
          font-size: 14px;
        \`;
      `;

      const result = parseStyledComponents(code);

      expect(typeof result[0].css).toBe('string');
    });

    it('should return empty array for no matches', () => {
      const code = 'const x = 1;';

      const result = parseStyledComponents(code);

      expect(result).toEqual([]);
    });
  });

  describe('parseCSSProps', () => {
    it('should parse css prop pattern', () => {
      const code = `
        const element = <div css={\`
          color: blue;
          background: white;
        \`} />;
      `;

      const result = parseCSSProps(code);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].type).toBe('css_prop');
    });

    it('should parse multiple css props', () => {
      const code = `
        const el1 = <div css={\`color: red;\`} />;
        const el2 = <span css={\`font-size: 14px;\`} />;
      `;

      const result = parseCSSProps(code);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should include line numbers', () => {
      const code = `
        const el = <div css={\`color: red;\`} />;
      `;

      const result = parseCSSProps(code);

      expect(typeof result[0].line).toBe('number');
    });

    it('should include CSS content', () => {
      const code = `
        const el = <div css={\`color: blue; padding: 10px;\`} />;
      `;

      const result = parseCSSProps(code);

      expect(typeof result[0].css).toBe('string');
      expect(result[0].css).toContain('color');
    });

    it('should return empty array for no matches', () => {
      const code = 'const x = 1;';

      const result = parseCSSProps(code);

      expect(result).toEqual([]);
    });
  });

  describe('Integration with factories', () => {
    it('should work with StyledComponentBuilder', () => {
      const builder = new StyledComponentBuilder();
      builder.withStyledImport()
        .withStyledTag('div', 'color: red;', 'RedDiv')
        .withStyledString('span', 'font-size: 14px;', 'StyledSpan')
        .withStyledComponent('Button', 'background: blue;', 'StyledButton');
      const { code } = builder.build();

      const tags = parseStyledTags(code);
      const strings = parseStyledStrings(code);
      const components = parseStyledComponents(code);

      expect(tags.length).toBeGreaterThanOrEqual(1);
      expect(strings.length).toBeGreaterThanOrEqual(1);
      expect(components.length).toBeGreaterThanOrEqual(1);
    });

    it('should work with CSSInJSScenarios', () => {
      const scenario = CSSInJSScenarios.multipleStyledComponents();

      const tags = parseStyledTags(scenario.code);

      expect(tags.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Error handling', () => {
    it('should handle null input', () => {
      expect(() => parseStyledTags(null)).not.toThrow();
      expect(() => parseStyledStrings(null)).not.toThrow();
      expect(() => parseStyledComponents(null)).not.toThrow();
      expect(() => parseCSSProps(null)).not.toThrow();
    });

    it('should handle undefined input', () => {
      expect(() => parseStyledTags(undefined)).not.toThrow();
      expect(() => parseStyledStrings(undefined)).not.toThrow();
      expect(() => parseStyledComponents(undefined)).not.toThrow();
      expect(() => parseCSSProps(undefined)).not.toThrow();
    });

    it('should return empty array for null/undefined', () => {
      expect(parseStyledTags(null)).toEqual([]);
      expect(parseStyledTags(undefined)).toEqual([]);
    });
  });
});

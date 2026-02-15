/**
 * @fileoverview CSS-in-JS Test Factory - Scenarios
 */

import { GlobalStyleBuilder, StyledComponentBuilder, ThemeBuilder } from './builders.js';

export const CSSInJSScenarios = {
  /**
   * Empty file scenario
   */
  emptyFile() {
    return { code: '', components: [], themes: [], globalStyles: [] };
  },

  /**
   * Simple styled component
   */
  simpleStyledComponent() {
    const builder = new StyledComponentBuilder();
    builder.withStyledImport()
      .withStyledTag('div', 'color: red;', 'RedDiv');
    return builder.build();
  },

  /**
   * Multiple styled components
   */
  multipleStyledComponents() {
    const builder = new StyledComponentBuilder();
    builder.withStyledImport()
      .withStyledTag('div', 'color: red;', 'RedDiv')
      .withStyledTag('span', 'font-size: 14px;', 'SmallSpan')
      .withStyledTag('button', 'background: blue;', 'BlueButton');
    return builder.build();
  },

  /**
   * Styled component with theme
   */
  themedStyledComponent() {
    const builder = new ThemeBuilder();
    builder.withStyledImport()
      .withThemeObject('theme', { colors: { primary: '#007bff' } })
      .withThemeProvider('theme')
      .withUseTheme('theme');
    return builder.build();
  },

  /**
   * Styled component extending another
   */
  extendingComponent() {
    const builder = new StyledComponentBuilder();
    builder.withStyledImport()
      .withStyledTag('button', 'padding: 10px;', 'BaseButton')
      .withStyledComponent('BaseButton', 'background: blue;', 'PrimaryButton');
    return builder.build();
  },

  /**
   * Global styles only
   */
  globalStylesOnly() {
    const builder = new GlobalStyleBuilder();
    builder.withGlobalStyleImport()
      .withCSSReset()
      .withTypographyGlobal();
    return builder.build();
  },

  /**
   * CSS prop (Emotion) usage
   */
  cssPropUsage() {
    return {
      code: `
const element = <div css={\`
  color: blue;
  background: white;
\`} />;
`,
      components: [{ type: 'css_prop' }]
    };
  },

  /**
   * Complex theme setup
   */
  complexTheme() {
    const builder = new ThemeBuilder();
    builder.withStyledImport()
      .withUseThemeImport()
      .withMultipleThemes()
      .withThemeProvider('lightTheme')
      .withUseTheme('currentTheme')
      .withThemeAccess('colors.primary', 'primary')
      .withThemeAccess('spacing.medium', 'spacing');
    return builder.build();
  },

  /**
   * Invalid syntax
   */
  invalidSyntax() {
    return { code: 'styled.div`broken', error: true };
  }
};

/**
 * Validation helpers for CSS-in-JS results
 */


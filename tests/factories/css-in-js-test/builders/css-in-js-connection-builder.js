/**
 * @fileoverview CSS-in-JS Connection Builder
 * Builder for creating CSS-in-JS connection scenarios
 */

import { StyledComponentBuilder } from './styled-component-builder.js';
import { ThemeBuilder } from './theme-builder.js';
import { GlobalStyleBuilder } from './global-style-builder.js';

export class CSSInJSConnectionBuilder {
  constructor() {
    this.files = new Map();
  }

  static create() {
    return new CSSInJSConnectionBuilder();
  }

  withStyledFile(filePath, builderFn) {
    const builder = new StyledComponentBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  withThemeFile(filePath, builderFn) {
    const builder = new ThemeBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  withGlobalStyleFile(filePath, builderFn) {
    const builder = new GlobalStyleBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  withThemeProviderFile(filePath = 'theme/ThemeProvider.jsx', themeName = 'appTheme') {
    const builder = new ThemeBuilder();
    builder.withStyledImport()
      .withThemeObject(themeName, {
        colors: { primary: '#007bff', secondary: '#6c757d' },
        spacing: { small: '8px', medium: '16px' }
      })
      .withThemeProvider(themeName);
    this.files.set(filePath, builder.build());
    return this;
  }

  withThemeConsumerFile(filePath = 'components/ThemedButton.jsx') {
    const builder = new StyledComponentBuilder();
    builder.withStyledImport()
      .withThemedStyled('button', 'colors.primary', 'ThemedButton')
      .withThemedStyled('div', 'colors.background', 'ThemedContainer');
    this.files.set(filePath, builder.build());
    return this;
  }

  withStyledExtensionChain(baseFile = 'components/BaseButton.jsx', extendingFile = 'components/ExtendedButton.jsx') {
    const baseBuilder = new StyledComponentBuilder();
    baseBuilder.withStyledImport()
      .withStyledTag('button', 'padding: 10px; border: none;', 'BaseButton');
    this.files.set(baseFile, baseBuilder.build());

    const extBuilder = new StyledComponentBuilder();
    extBuilder.withStyledImport()
      .withImport('./BaseButton', ['BaseButton'])
      .withStyledComponent('BaseButton', 'background: blue; color: white;', 'ExtendedButton');
    this.files.set(extendingFile, extBuilder.build());

    return this;
  }

  withCSSInJSArchitecture() {
    return this
      .withThemeProviderFile('theme/index.js', 'theme')
      .withThemeConsumerFile('components/Button.jsx')
      .withGlobalStyleFile('styles/GlobalStyles.jsx', builder => {
        builder.withGlobalStyleImport()
          .withCSSReset()
          .withGlobalStyleUsage('CSSReset');
      })
      .withStyledFile('components/Card.jsx', builder => {
        builder.withStyledImport()
          .withStyledTag('div', 'border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);', 'Card')
          .withStyledTag('h2', 'margin: 0 0 16px;', 'CardTitle')
          .withStyledTag('p', 'color: #666;', 'CardContent');
      });
  }

  build() {
    const result = {};
    for (const [path, data] of this.files) {
      result[path] = data;
    }
    return result;
  }
}

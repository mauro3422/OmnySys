/**
 * @fileoverview CSS-in-JS Test Factory - Builders
 */

export class StyledComponentBuilder {
  constructor() {
    this.code = '';
    this.imports = new Set();
    this.components = [];
  }

  /**
   * Add styled-components import
   */
  withStyledImport() {
    this.imports.add("import styled from 'styled-components';");
    return this;
  }

  /**
   * Create a styled tag component: styled.div`...`
   * @param {string} tag - HTML tag name
   * @param {string} styles - CSS styles
   * @param {string} name - Component name
   */
  withStyledTag(tag = 'div', styles = 'color: red;', name = 'StyledDiv') {
    this.code += `
const ${name} = styled.${tag}\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_tag', tag, name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create a styled string component: styled('div')`...`
   * @param {string} tag - HTML tag name
   * @param {string} styles - CSS styles
   * @param {string} name - Component name
   */
  withStyledString(tag = 'span', styles = 'font-size: 14px;', name = 'StyledSpan') {
    this.code += `
const ${name} = styled('${tag}')\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_string', tag, name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create a styled component wrapper: styled(Component)`...`
   * @param {string} baseComponent - Base component name
   * @param {string} styles - CSS styles
   * @param {string} name - New component name
   */
  withStyledComponent(baseComponent = 'Button', styles = 'background: blue;', name = 'StyledButton') {
    this.code += `
const ${name} = styled(${baseComponent})\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_component', baseComponent, name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create a styled component with theme interpolation
   * @param {string} tag - HTML tag
   * @param {string} themePath - Theme property path (e.g., 'colors.primary')
   * @param {string} name - Component name
   */
  withThemedStyled(tag = 'div', themePath = 'colors.primary', name = 'ThemedDiv') {
    this.code += `
const ${name} = styled.${tag}\`
  color: \${props => props.theme.${themePath}};
  background: \${({ theme }) => theme.colors.secondary};
\`;
`;
    this.components.push({ type: 'styled_tag', tag, name, hasTheme: true, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create a styled component with dynamic props
   * @param {string} tag - HTML tag
   * @param {string} propName - Prop to use
   * @param {string} name - Component name
   */
  withDynamicStyled(tag = 'button', propName = 'primary', name = 'DynamicButton') {
    this.code += `
const ${name} = styled.${tag}\`
  background: \${props => props.${propName} ? 'blue' : 'gray'};
  padding: \${props => props.size || '10px'};
\`;
`;
    this.components.push({ type: 'styled_tag', tag, name, hasProps: true, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create nested styled component
   * @param {string} parent - Parent component name
   * @param {string} styles - CSS styles
   * @param {string} name - Child component name
   */
  withNestedStyled(parent = 'Container', styles = 'margin: 10px;', name = 'NestedChild') {
    this.code += `
const ${name} = styled(${parent})\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_component', baseComponent: parent, name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create CSS prop (Emotion) usage
   * @param {string} styles - CSS styles
   */
  withCSSProp(styles = 'color: green;') {
    this.code += `
const element = <div css={\`
  ${styles}
\`} />;
`;
    this.components.push({ type: 'css_prop', line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create multiple styled components
   * @param {Array<{tag: string, name: string}>} components
   */
  withMultipleStyled(components = [{ tag: 'div', name: 'Div1' }, { tag: 'span', name: 'Span1' }]) {
    components.forEach(({ tag, name, styles }) => {
      this.withStyledTag(tag, styles || 'color: black;', name);
    });
    return this;
  }

  /**
   * Create styled component extending another
   * @param {string} baseName - Base styled component name
   * @param {string} styles - Additional styles
   * @param {string} newName - New component name
   */
  withExtendedStyled(baseName = 'BaseButton', styles = 'border-radius: 4px;', newName = 'ExtendedButton') {
    this.code += `
const ${newName} = styled(${baseName})\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_component', baseComponent: baseName, name: newName, line: this.estimateLineNumber() });
    return this;
  }

  estimateLineNumber() {
    return this.code.split('\n').length + this.imports.size + 1;
  }

  build() {
    const imports = Array.from(this.imports).join('\n') + '\n';
    return {
      code: imports + this.code,
      components: this.components
    };
  }
}

/**
 * Builder for creating theme-related test code
 */
export class ThemeBuilder {
  constructor() {
    this.code = '';
    this.imports = new Set();
    this.themes = [];
  }

  /**
   * Add styled-components import
   */
  withStyledImport() {
    this.imports.add("import styled, { ThemeProvider } from 'styled-components';");
    return this;
  }

  /**
   * Add useTheme hook import
   */
  withUseThemeImport() {
    this.imports.add("import { useTheme } from 'styled-components';");
    return this;
  }

  /**
   * Create a theme object
   * @param {string} name - Theme variable name
   * @param {Object} themeObj - Theme properties
   */
  withThemeObject(name = 'theme', themeObj = { colors: { primary: '#000', secondary: '#fff' } }) {
    const themeStr = JSON.stringify(themeObj, null, 2).replace(/"/g, "'");
    this.code += `
const ${name} = ${themeStr};
`;
    this.themes.push({ type: 'theme_object', name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create ThemeProvider usage
   * @param {string} themeVar - Theme variable name
   * @param {string} children - Children content
   */
  withThemeProvider(themeVar = 'theme', children = '<App />') {
    this.code += `
const App = () => (
  <ThemeProvider theme={${themeVar}}>
    ${children}
  </ThemeProvider>
);
`;
    this.themes.push({ type: 'theme_provider', themeVar, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create useTheme hook usage
   * @param {string} variableName - Variable to assign to
   */
  withUseTheme(variableName = 'theme') {
    this.code += `
const ${variableName} = useTheme();
`;
    this.themes.push({ type: 'use_theme', variableName, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create withTheme HOC usage
   * @param {string} componentName - Component to wrap
   * @param {string} newName - Wrapped component name
   */
  withWithTheme(componentName = 'MyComponent', newName = 'ThemedComponent') {
    this.code += `
const ${newName} = withTheme(${componentName});
`;
    this.themes.push({ type: 'with_theme', component: componentName, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create theme access pattern: theme.colors.primary
   * @param {string} path - Theme path (e.g., 'colors.primary')
   * @param {string} variableName - Variable to assign to
   */
  withThemeAccess(path = 'colors.primary', variableName = 'primaryColor') {
    this.code += `
const ${variableName} = theme.${path};
`;
    this.themes.push({ type: 'theme_access', path, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create props.theme access pattern
   * @param {string} path - Theme path
   * @param {string} componentName - Component name
   */
  withPropsThemeAccess(path = 'colors.primary', componentName = 'ThemedDiv') {
    this.code += `
const ${componentName} = styled.div\`
  color: \${props => props.theme.${path}};
\`;
`;
    this.themes.push({ type: 'theme_access', path: `props.theme.${path}`, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create complete theme setup
   * @param {string} themeName - Theme object name
   */
  withCompleteTheme(themeName = 'lightTheme') {
    return this.withStyledImport()
      .withThemeObject(themeName, {
        colors: { primary: '#007bff', secondary: '#6c757d', background: '#ffffff' },
        fonts: { main: 'Arial, sans-serif' },
        spacing: { small: '8px', medium: '16px', large: '24px' }
      })
      .withThemeProvider(themeName);
  }

  /**
   * Create multiple theme objects (light/dark)
   */
  withMultipleThemes() {
    this.withThemeObject('lightTheme', {
      colors: { primary: '#007bff', background: '#ffffff', text: '#000000' }
    });
    this.withThemeObject('darkTheme', {
      colors: { primary: '#4dabf7', background: '#212529', text: '#ffffff' }
    });
    return this;
  }

  estimateLineNumber() {
    return this.code.split('\n').length + this.imports.size + 1;
  }

  build() {
    const imports = Array.from(this.imports).join('\n') + '\n';
    return {
      code: imports + this.code,
      themes: this.themes
    };
  }
}

/**
 * Builder for creating global styles test code
 */
export class GlobalStyleBuilder {
  constructor() {
    this.code = '';
    this.imports = new Set();
    this.globalStyles = [];
  }

  /**
   * Add createGlobalStyle import
   */
  withGlobalStyleImport() {
    this.imports.add("import { createGlobalStyle } from 'styled-components';");
    return this;
  }

  /**
   * Create global styles
   * @param {string} name - GlobalStyle variable name
   * @param {string} css - CSS content
   */
  withGlobalStyle(name = 'GlobalStyle', css = 'body { margin: 0; padding: 0; }') {
    this.code += `
const ${name} = createGlobalStyle\`
  ${css}
\`;
`;
    this.globalStyles.push({ name, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create global styles with theme access
   * @param {string} name - GlobalStyle variable name
   * @param {string} themePath - Theme property to use
   */
  withThemedGlobalStyle(name = 'ThemedGlobalStyle', themePath = 'colors.background') {
    this.code += `
const ${name} = createGlobalStyle\`
  body {
    background-color: \${props => props.theme.${themePath}};
    color: \${props => props.theme.colors.text};
  }
\`;
`;
    this.globalStyles.push({ name, themed: true, line: this.estimateLineNumber() });
    return this;
  }

  /**
   * Create CSS reset global styles
   * @param {string} name - GlobalStyle variable name
   */
  withCSSReset(name = 'CSSReset') {
    const reset = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html, body {
    height: 100%;
    font-family: sans-serif;
  }
  
  ul, ol {
    list-style: none;
  }
  
  a {
    text-decoration: none;
    color: inherit;
  }
`;
    return this.withGlobalStyle(name, reset);
  }

  /**
   * Create typography global styles
   * @param {string} name - GlobalStyle variable name
   */
  withTypographyGlobal(name = 'TypographyGlobal') {
    const typography = `
  h1, h2, h3, h4, h5, h6 {
    margin-bottom: 0.5em;
    font-weight: 600;
    line-height: 1.2;
  }
  
  p {
    margin-bottom: 1em;
    line-height: 1.6;
  }
  
  code {
    font-family: monospace;
    background: #f4f4f4;
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }
`;
    return this.withGlobalStyle(name, typography);
  }

  /**
   * Create global style usage in component
   * @param {string} globalStyleName - Global style variable name
   */
  withGlobalStyleUsage(globalStyleName = 'GlobalStyle') {
    this.code += `
const App = () => (
  <>
    <${globalStyleName} />
    <div>App content</div>
  </>
);
`;
    return this;
  }

  estimateLineNumber() {
    return this.code.split('\n').length + this.imports.size + 1;
  }

  build() {
    const imports = Array.from(this.imports).join('\n') + '\n';
    return {
      code: imports + this.code,
      globalStyles: this.globalStyles
    };
  }
}

/**
 * Builder for creating CSS-in-JS connection scenarios
 */
export class CSSInJSConnectionBuilder {
  constructor() {
    this.files = new Map();
  }

  /**
   * Add a file with styled components
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives StyledComponentBuilder
   */
  withStyledFile(filePath, builderFn) {
    const builder = new StyledComponentBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with theme usage
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives ThemeBuilder
   */
  withThemeFile(filePath, builderFn) {
    const builder = new ThemeBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Add a file with global styles
   * @param {string} filePath - File path
   * @param {Function} builderFn - Function that receives GlobalStyleBuilder
   */
  withGlobalStyleFile(filePath, builderFn) {
    const builder = new GlobalStyleBuilder();
    builderFn(builder);
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create theme provider file
   * @param {string} filePath - File path
   * @param {string} themeName - Theme name
   */
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

  /**
   * Create theme consumer file
   * @param {string} filePath - File path
   */
  withThemeConsumerFile(filePath = 'components/ThemedButton.jsx') {
    const builder = new StyledComponentBuilder();
    builder.withStyledImport()
      .withThemedStyled('button', 'colors.primary', 'ThemedButton')
      .withThemedStyled('div', 'colors.background', 'ThemedContainer');
    this.files.set(filePath, builder.build());
    return this;
  }

  /**
   * Create styled extension chain
   * @param {string} baseFile - Base component file
   * @param {string} extendingFile - Extending component file
   */
  withStyledExtensionChain(baseFile = 'components/BaseButton.jsx', extendingFile = 'components/ExtendedButton.jsx') {
    // Base component file
    const baseBuilder = new StyledComponentBuilder();
    baseBuilder.withStyledImport()
      .withStyledTag('button', 'padding: 10px; border: none;', 'BaseButton');
    this.files.set(baseFile, baseBuilder.build());

    // Extending component file
    const extBuilder = new StyledComponentBuilder();
    extBuilder.withStyledImport()
      .withImport('./BaseButton', ['BaseButton'])
      .withStyledComponent('BaseButton', 'background: blue; color: white;', 'ExtendedButton');
    this.files.set(extendingFile, extBuilder.build());

    return this;
  }

  /**
   * Import helper
   */
  withImport(source, specifiers = []) {
    this.code += `import { ${specifiers.join(', ')} } from '${source}';
`;
    return this;
  }

  /**
   * Create complete CSS-in-JS architecture
   */
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
    for (const [path, data] of Object.entries(this.files)) {
      result[path] = data;
    }
    return result;
  }
}

/**
 * Predefined CSS-in-JS test scenarios
 */


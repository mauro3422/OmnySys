/**
 * @fileoverview Theme Builder
 * Builder for creating theme-related test code
 */

export class ThemeBuilder {
  constructor() {
    this.code = '';
    this.imports = new Set();
    this.themes = [];
  }

  static create() {
    return new ThemeBuilder();
  }

  withStyledImport() {
    this.imports.add("import styled, { ThemeProvider } from 'styled-components';");
    return this;
  }

  withUseThemeImport() {
    this.imports.add("import { useTheme } from 'styled-components';");
    return this;
  }

  withThemeObject(name = 'theme', themeObj = { colors: { primary: '#000', secondary: '#fff' } }) {
    const themeStr = JSON.stringify(themeObj, null, 2).replace(/"/g, "'");
    this.code += `
const ${name} = ${themeStr};
`;
    this.themes.push({ type: 'theme_object', name, line: this.estimateLineNumber() });
    return this;
  }

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

  withUseTheme(variableName = 'theme') {
    this.code += `
const ${variableName} = useTheme();
`;
    this.themes.push({ type: 'use_theme', variableName, line: this.estimateLineNumber() });
    return this;
  }

  withWithTheme(componentName = 'MyComponent', newName = 'ThemedComponent') {
    this.code += `
const ${newName} = withTheme(${componentName});
`;
    this.themes.push({ type: 'with_theme', component: componentName, line: this.estimateLineNumber() });
    return this;
  }

  withThemeAccess(path = 'colors.primary', variableName = 'primaryColor') {
    this.code += `
const ${variableName} = theme.${path};
`;
    this.themes.push({ type: 'theme_access', path, line: this.estimateLineNumber() });
    return this;
  }

  withPropsThemeAccess(path = 'colors.primary', componentName = 'ThemedDiv') {
    this.code += `
const ${componentName} = styled.div\`
  color: \${props => props.theme.${path}};
\`;
`;
    this.themes.push({ type: 'theme_access', path: `props.theme.${path}`, line: this.estimateLineNumber() });
    return this;
  }

  withCompleteTheme(themeName = 'lightTheme') {
    return this.withStyledImport()
      .withThemeObject(themeName, {
        colors: { primary: '#007bff', secondary: '#6c757d', background: '#ffffff' },
        fonts: { main: 'Arial, sans-serif' },
        spacing: { small: '8px', medium: '16px', large: '24px' }
      })
      .withThemeProvider(themeName);
  }

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

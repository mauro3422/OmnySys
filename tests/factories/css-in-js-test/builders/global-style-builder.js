/**
 * @fileoverview Global Style Builder
 * Builder for creating global styles test code
 */

export class GlobalStyleBuilder {
  constructor() {
    this.code = '';
    this.imports = new Set();
    this.globalStyles = [];
  }

  static create() {
    return new GlobalStyleBuilder();
  }

  withGlobalStyleImport() {
    this.imports.add("import { createGlobalStyle } from 'styled-components';");
    return this;
  }

  withGlobalStyle(name = 'GlobalStyle', css = 'body { margin: 0; padding: 0; }') {
    this.code += `
const ${name} = createGlobalStyle\`
  ${css}
\`;
`;
    this.globalStyles.push({ name, line: this.estimateLineNumber() });
    return this;
  }

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

/**
 * @fileoverview Styled Component Builder
 * Builder for creating styled-components test code
 */

export class StyledComponentBuilder {
  constructor() {
    this.code = '';
    this.imports = new Set();
    this.components = [];
  }

  static create() {
    return new StyledComponentBuilder();
  }

  withStyledImport() {
    this.imports.add("import styled from 'styled-components';");
    return this;
  }

  withStyledTag(tag = 'div', styles = 'color: red;', name = 'StyledDiv') {
    this.code += `
const ${name} = styled.${tag}\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_tag', tag, name, line: this.estimateLineNumber() });
    return this;
  }

  withStyledString(tag = 'span', styles = 'font-size: 14px;', name = 'StyledSpan') {
    this.code += `
const ${name} = styled('${tag}')\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_string', tag, name, line: this.estimateLineNumber() });
    return this;
  }

  withStyledComponent(baseComponent = 'Button', styles = 'background: blue;', name = 'StyledButton') {
    this.code += `
const ${name} = styled(${baseComponent})\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_component', baseComponent, name, line: this.estimateLineNumber() });
    return this;
  }

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

  withNestedStyled(parent = 'Container', styles = 'margin: 10px;', name = 'NestedChild') {
    this.code += `
const ${name} = styled(${parent})\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_component', baseComponent: parent, name, line: this.estimateLineNumber() });
    return this;
  }

  withCSSProp(styles = 'color: green;') {
    this.code += `
const element = <div css={\`
  ${styles}
\`} />;
`;
    this.components.push({ type: 'css_prop', line: this.estimateLineNumber() });
    return this;
  }

  withMultipleStyled(components = [{ tag: 'div', name: 'Div1' }, { tag: 'span', name: 'Span1' }]) {
    components.forEach(({ tag, name, styles }) => {
      this.withStyledTag(tag, styles || 'color: black;', name);
    });
    return this;
  }

  withExtendedStyled(baseName = 'BaseButton', styles = 'border-radius: 4px;', newName = 'ExtendedButton') {
    this.code += `
const ${newName} = styled(${baseName})\`
  ${styles}
\`;
`;
    this.components.push({ type: 'styled_component', baseComponent: baseName, name: newName, line: this.estimateLineNumber() });
    return this;
  }

  withImport(source, specifiers = []) {
    this.imports.add(`import { ${specifiers.join(', ')} } from '${source}';`);
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

/**
 * @fileoverview Code Sample Builder - Builder principal para muestras de código
 * @module tests/factories/extractor-test/code-sample-builder
 */

import { BaseBuilder, PARSER_CONFIG } from './base-builder.js';

/**
 * Builder for creating code samples to test extractors
 */
export class CodeSampleBuilder extends BaseBuilder {
  constructor() {
    super();
  }

  withFunction(name, params = [], body = 'return null;', options = {}) {
    const async = options.async ? 'async ' : '';
    const generator = options.generator ? '* ' : '';
    const exported = options.exported ? 'export ' : '';
    const paramStr = params.join(', ');
    this.code += `${exported}${async}function${generator} ${name}(${paramStr}) {
  ${body}
}

`;
    return this;
  }

  withArrow(name, params = [], body = 'null', options = {}) {
    const paramStr = params.join(', ');
    const blockBody = options.block ? `{
  return ${body};
}` : body;
    const exported = options.exported ? 'export ' : '';
    this.code += `${exported}const ${name} = (${paramStr}) => ${blockBody};

`;
    return this;
  }

  withClass(name, methods = [], options = {}) {
    const exported = options.exported ? 'export ' : '';
    this.code += `${exported}class ${name} {
`;
    for (const method of methods) {
      const static_ = method.static ? 'static ' : '';
      const async = method.async ? 'async ' : '';
      const generator = method.generator ? '* ' : '';
      const private_ = method.private ? '#' : '';
      const kind = method.kind || 'method';
      const params = method.params?.join(', ') || '';
      const body = method.body || '';
      
      if (kind === 'get' || kind === 'set') {
        this.code += `  ${static_}${kind} ${method.name}(${params}) {
    ${body}
  }

`;
      } else {
        this.code += `  ${static_}${async}${generator}${private_}${method.name}(${params}) {
    ${body}
  }

`;
      }
    }
    this.code += `}\n\n`;
    return this;
  }

  withImport(source, specifiers = [], isDefault = false) {
    if (isDefault && specifiers.length > 0) {
      this.code += `import ${specifiers[0]} from '${source}';
`;
    } else if (specifiers.length > 0) {
      this.code += `import { ${specifiers.join(', ')} } from '${source}';
`;
    } else {
      this.code += `import '${source}';
`;
    }
    return this;
  }

  withExport(name, isDefault = false) {
    if (isDefault) {
      this.code += `export default ${name};
`;
    } else {
      this.code += `export { ${name} };
`;
    }
    return this;
  }

  withWebSocket(url) {
    this.code += `const ws = new WebSocket('${url}');
`;
    return this;
  }

  withFetch(url) {
    this.code += `fetch('${url}').then(r => r.json());
`;
    return this;
  }

  withWorker(path) {
    this.code += `const worker = new Worker('${path}');
`;
    return this;
  }

  withRedux(sliceName) {
    this.code += `
import { createSlice } from '@reduxjs/toolkit';
const ${sliceName}Slice = createSlice({
  name: '${sliceName}',
  initialState: {},
  reducers: {}
});
`;
    return this;
  }

  withLocalStorage(key, value) {
    this.code += `localStorage.setItem('${key}', '${value}');
`;
    return this;
  }

  withEventListener(event, handler) {
    this.code += `document.addEventListener('${event}', ${handler});
`;
    return this;
  }

  withGlobalAccess(prop) {
    this.code += `window.${prop} = 'value';
`;
    return this;
  }

  withFunctionExpression(name, params = [], body = 'return null;', options = {}) {
    const async = options.async ? 'async ' : '';
    const generator = options.generator ? '* ' : '';
    const exported = options.exported ? 'export ' : '';
    const paramStr = params.join(', ');
    this.code += `${exported}const ${name} = ${async}function${generator}(${paramStr}) {
  ${body}
};

`;
    return this;
  }

  withDefaultExportFunction(name, params = [], body = 'return null;') {
    const paramStr = params.join(', ');
    this.code += `export default function ${name}(${paramStr}) {
  ${body}
}

`;
    return this;
  }

  withGetterSetter(className, propName, getterBody = 'return this._value;', setterBody = 'this._value = value;') {
    this.code += `class ${className} {
  get ${propName}() {
    ${getterBody}
  }

  set ${propName}(value) {
    ${setterBody}
  }
}

`;
    return this;
  }

  withConstructor(params = [], body = '') {
    const paramStr = params.join(', ');
    this.code += `  constructor(${paramStr}) {
    ${body}
  }

`;
    return this;
  }
}

export default { CodeSampleBuilder };

/**
 * @fileoverview Parser Test Factory - Builders
 */

import { parse } from '@babel/parser';

export class CodeSampleBuilder {
  constructor() {
    this.code = '';
    this.filePath = 'test.js';
  }

  withFunction(name, params = [], body = 'return null;', options = {}) {
    const async = options.async ? 'async ' : '';
    const generator = options.generator ? '* ' : '';
    const exported = options.exported ? 'export ' : '';
    const paramStr = params.join(', ');
    const funcCode = exported + async + 'function' + generator + ' ' + name + '(' + paramStr + ') {\n  ' + body + '\n}\n\n';
    this.code += funcCode;
    return this;
  }

  withArrow(name, params = [], body = 'null', options = {}) {
    const exported = options.exported ? 'export ' : '';
    const paramStr = params.join(', ');
    const blockBody = options.block ? '{\n  return ' + body + ';\n}' : body;
    const arrowCode = exported + 'const ' + name + ' = (' + paramStr + ') => ' + blockBody + ';\n\n';
    this.code += arrowCode;
    return this;
  }

  withFunctionExpression(name, params = [], body = 'return null;', options = {}) {
    const exported = options.exported ? 'export ' : '';
    const async = options.async ? 'async ' : '';
    const paramStr = params.join(', ');
    const exprCode = exported + 'const ' + name + ' = ' + async + 'function(' + paramStr + ') {\n  ' + body + '\n};\n\n';
    this.code += exprCode;
    return this;
  }

  withClass(name, methods = [], options = {}) {
    const exported = options.exported ? 'export ' : '';
    const extendsClause = options.extends ? ' extends ' + options.extends : '';
    let classCode = exported + 'class ' + name + extendsClause + ' {\n';
    for (const method of methods) {
      const staticKeyword = method.static ? 'static ' : '';
      const async = method.async ? 'async ' : '';
      const params = method.params?.join(', ') || '';
      const methodBody = method.body || '';
      classCode += '  ' + staticKeyword + async + method.name + '(' + params + ') {\n    ' + methodBody + '\n  }\n\n';
    }
    classCode += '}\n\n';
    this.code += classCode;
    return this;
  }

  withImport(source, specifiers = [], options = {}) {
    let importCode = '';
    if (options.default && specifiers.length > 0) {
      importCode = "import " + specifiers[0] + " from '" + source + "';\n";
    } else if (options.namespace && specifiers.length > 0) {
      importCode = "import * as " + specifiers[0] + " from '" + source + "';\n";
    } else if (specifiers.length > 0) {
      const specStr = specifiers.join(', ');
      importCode = "import { " + specStr + " } from '" + source + "';\n";
    } else {
      importCode = "import '" + source + "';\n";
    }
    this.code += importCode + '\n';
    return this;
  }

  withExport(name, options = {}) {
    if (options.default) {
      this.code += 'export default ' + name + ';\n\n';
    } else if (options.kind) {
      this.code += 'export ' + options.kind + ' ' + name + ' = ...;\n\n';
    } else {
      this.code += 'export { ' + name + ' };\n\n';
    }
    return this;
  }

  withExportDeclaration(kind, name, value) {
    if (kind === 'function') {
      this.code += 'export function ' + name + '() {\n  ' + (value || 'return null;') + '\n}\n\n';
    } else if (kind === 'class') {
      this.code += 'export class ' + name + ' {\n  ' + (value || '') + '\n}\n\n';
    } else {
      this.code += 'export ' + kind + ' ' + name + ' = ' + (value || 'null') + ';\n\n';
    }
    return this;
  }

  withRequire(variable, source) {
    if (variable) {
      this.code += "const " + variable + " = require('" + source + "');\n\n";
    } else {
      this.code += "require('" + source + "');\n\n";
    }
    return this;
  }

  withDynamicImport(source, variable = null) {
    if (variable) {
      this.code += 'const ' + variable + ' = await import(\'' + source + '\');\n\n';
    } else {
      this.code += 'import(\'' + source + '\');\n\n';
    }
    return this;
  }

  withCall(name, args = []) {
    const argStr = args.join(', ');
    this.code += name + '(' + argStr + ');\n\n';
    return this;
  }

  withMemberCall(object, method, args = []) {
    const argStr = args.join(', ');
    this.code += object + '.' + method + '(' + argStr + ');\n\n';
    return this;
  }

  withTSInterface(name, properties = {}, options = {}) {
    const exported = options.exported ? 'export ' : '';
    let interfaceCode = exported + 'interface ' + name + ' {\n';
    for (const [propName, propType] of Object.entries(properties)) {
      interfaceCode += '  ' + propName + ': ' + propType + ';\n';
    }
    interfaceCode += '}\n\n';
    this.code += interfaceCode;
    return this;
  }

  withTSTypeAlias(name, definition, options = {}) {
    const exported = options.exported ? 'export ' : '';
    this.code += exported + 'type ' + name + ' = ' + definition + ';\n\n';
    return this;
  }

  withTSEnum(name, members = {}, options = {}) {
    const exported = options.exported ? 'export ' : '';
    let enumCode = exported + 'enum ' + name + ' {\n';
    for (const [memberName, memberValue] of Object.entries(members)) {
      enumCode += '  ' + memberName + (memberValue !== undefined ? ' = ' + memberValue : '') + ',\n';
    }
    enumCode += '}\n\n';
    this.code += enumCode;
    return this;
  }

  withVariable(kind, name, value, options = {}) {
    const exported = options.exported ? 'export ' : '';
    this.code += exported + kind + ' ' + name + ' = ' + value + ';\n\n';
    return this;
  }

  withObject(name, properties = {}, options = {}) {
    const exported = options.exported ? 'export ' : '';
    const props = Object.entries(properties).map(([key, val]) => {
      if (typeof val === 'function') {
        return '  ' + key + val();
      } else if (typeof val === 'object' && val !== null) {
        return '  ' + key + ': ' + JSON.stringify(val);
      } else {
        return '  ' + key + ': ' + val;
      }
    }).join(',\n');
    this.code += exported + 'const ' + name + ' = {\n' + props + '\n};\n\n';
    return this;
  }

  atFilePath(filePath) {
    this.filePath = filePath;
    return this;
  }

  withRaw(code) {
    this.code += code + '\n';
    return this;
  }

  build() {
    return {
      code: this.code,
      filePath: this.filePath
    };
  }
}

// Builder for creating AST structures
export class ASTBuilder {
  constructor() {
    this.nodes = [];
  }

  static parse(code, options = {}) {
    const defaultOptions = {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      plugins: ['jsx', 'objectRestSpread', 'decorators', 'classProperties', 'typescript']
    };
    return parse(code, { ...defaultOptions, ...options });
  }

  static createMockNodePath(node, parent = null) {
    return {
      node,
      parent,
      parentPath: parent ? { node: parent, type: parent.type } : null,
      isReferencedIdentifier: () => true,
      traverse: () => {}
    };
  }

  static buildFileInfo(overrides = {}) {
    return {
      filePath: '/test/file.js',
      fileName: 'file.js',
      ext: '.js',
      imports: [],
      exports: [],
      definitions: [],
      calls: [],
      functions: [],
      identifierRefs: [],
      typeDefinitions: [],
      enumDefinitions: [],
      constantExports: [],
      objectExports: [],
      typeUsages: [],
      ...overrides
    };
  }
}

// Builder for creating import statements
export class ImportBuilder {
  constructor() {
    this.imports = [];
  }

  withNamed(source, imported, local = null) {
    this.imports.push({
      type: 'named',
      source,
      imported,
      local: local || imported
    });
    return this;
  }

  withDefault(source, local) {
    this.imports.push({
      type: 'default',
      source,
      local
    });
    return this;
  }

  withNamespace(source, local) {
    this.imports.push({
      type: 'namespace',
      source,
      local
    });
    return this;
  }

  withCommonJS(source) {
    this.imports.push({
      type: 'commonjs',
      source
    });
    return this;
  }

  withDynamic(source) {
    this.imports.push({
      type: 'dynamic',
      source
    });
    return this;
  }

  build() {
    return this.imports;
  }
}

// Builder for creating export statements
export class ExportBuilder {
  constructor() {
    this.exports = [];
  }

  withNamed(name, local = null, source = null) {
    this.exports.push({
      type: source ? 'reexport' : 'named',
      name,
      local: local || name,
      ...(source && { source })
    });
    return this;
  }

  withDefault(kind = 'FunctionDeclaration') {
    this.exports.push({
      type: 'default',
      kind
    });
    return this;
  }

  withDeclaration(kind, name) {
    this.exports.push({
      type: 'declaration',
      kind,
      name
    });
    return this;
  }

  build() {
    return this.exports;
  }
}

// Factory for creating common parser test scenarios


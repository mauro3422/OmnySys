/**
 * @fileoverview Import Export Builder
 * 
 * Builder for import/export test scenarios.
 * 
 * @module tests/factories/comprehensive-extractor-test/builders/import-export-builder
 */

export class ImportExportBuilder {
  constructor() {
    this.code = '';
    this.imports = [];
    this.exports = [];
  }

  // === IMPORTS ===

  withNamedImport(names, source) {
    this.imports.push({ type: 'NamedImport', names, source });
    this.code += `import { ${names.join(', ')} } from '${source}';
`;
    return this;
  }

  withDefaultImport(name, source) {
    this.imports.push({ type: 'DefaultImport', name, source });
    this.code += `import ${name} from '${source}';
`;
    return this;
  }

  withNamespaceImport(name, source) {
    this.imports.push({ type: 'NamespaceImport', name, source });
    this.code += `import * as ${name} from '${source}';
`;
    return this;
  }

  withSideEffectImport(source) {
    this.imports.push({ type: 'SideEffectImport', source });
    this.code += `import '${source}';
`;
    return this;
  }

  withCommonJSRequire(names, source) {
    this.imports.push({ type: 'CommonJSRequire', names, source });
    const nameStr = Array.isArray(names) 
      ? `{ ${names.join(', ')} }` 
      : names;
    this.code += `const ${nameStr} = require('${source}');
`;
    return this;
  }

  withDynamicImport(source, options = {}) {
    const { lazy = false, conditional = false, hasAwait = true } = options;
    
    if (conditional) {
      this.code += `if (condition) {
  ${hasAwait ? 'await ' : ''}import('${source}');
}
`;
    } else if (lazy) {
      this.code += `const lazyModule = ${hasAwait ? 'await ' : ''}import('${source}');
`;
    } else {
      this.code += `${hasAwait ? 'await ' : ''}import('${source}');
`;
    }
    
    return this;
  }

  // === EXPORTS ===

  withNamedExport(name, value = null) {
    this.exports.push({ type: 'NamedExport', name });
    if (value !== null) {
      this.code += `export const ${name} = ${value};
`;
    } else {
      this.code += `export { ${name} };
`;
    }
    return this;
  }

  withDefaultExport(name) {
    this.exports.push({ type: 'DefaultExport', name });
    this.code += `export default ${name};
`;
    return this;
  }

  withDefaultExportFunction(name, params = []) {
    this.exports.push({ type: 'DefaultExport', name });
    this.code += `export default function ${name}(${params.join(', ')}) {
  return null;
}
`;
    return this;
  }

  withDefaultExportClass(name) {
    this.exports.push({ type: 'DefaultExport', name });
    this.code += `export default class ${name} {}
`;
    return this;
  }

  withReExport(names, source) {
    this.exports.push({ type: 'ReExport', names, source });
    this.code += `export { ${names.join(', ')} } from '${source}';
`;
    return this;
  }

  withExportAll(source) {
    this.exports.push({ type: 'ExportAll', source });
    this.code += `export * from '${source}';
`;
    return this;
  }

  withCommonJSExport(names) {
    if (Array.isArray(names)) {
      this.exports.push({ type: 'CommonJSExport', names });
      this.code += `module.exports = { ${names.join(', ')} };
`;
    } else {
      this.exports.push({ type: 'CommonJSExport', names: [names] });
      this.code += `module.exports = ${names};
`;
    }
    return this;
  }

  withExportsProperty(name) {
    this.exports.push({ type: 'CommonJSExport', names: [name] });
    this.code += `exports.${name} = ${name};
`;
    return this;
  }

  // === BARREL PATTERN ===

  asBarrelFile(sources) {
    this.code = '';
    sources.forEach(source => {
      this.code += `export * from '${source}';
`;
    });
    return this;
  }

  build() {
    return {
      code: this.code,
      imports: this.imports,
      exports: this.exports
    };
  }

  static es6Imports() {
    return new ImportExportBuilder()
      .withNamedImport(['foo', 'bar'], './module')
      .withDefaultImport('DefaultExport', './default')
      .withNamespaceImport('Namespace', './namespace')
      .withSideEffectImport('./polyfill')
      .build();
  }

  static commonJSImports() {
    return new ImportExportBuilder()
      .withCommonJSRequire(['foo', 'bar'], './module')
      .withCommonJSRequire('defaultExport', './default')
      .build();
  }

  static mixedImports() {
    return new ImportExportBuilder()
      .withNamedImport(['es6Named'], './es6')
      .withCommonJSRequire(['cjsNamed'], './cjs')
      .withDynamicImport('./dynamic')
      .build();
  }

  static es6Exports() {
    return new ImportExportBuilder()
      .withNamedExport('foo', '1')
      .withNamedExport('bar', '2')
      .withDefaultExport('defaultFn')
      .build();
  }

  static commonJSExports() {
    return new ImportExportBuilder()
      .withCommonJSExport(['foo', 'bar'])
      .withExportsProperty('baz')
      .build();
  }

  static barrelFile() {
    return new ImportExportBuilder()
      .withExportAll('./module1')
      .withExportAll('./module2')
      .withReExport(['named1', 'named2'], './module3')
      .build();
  }
}

export default ImportExportBuilder;

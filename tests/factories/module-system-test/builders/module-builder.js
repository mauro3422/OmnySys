/**
 * @fileoverview Module Builder
 * 
 * Builder for module test scenarios.
 * 
 * @module tests/factories/module-system-test/builders/module-builder
 */

export class ModuleBuilder {
  constructor(name) {
    this.moduleName = name;
    this.modulePath = `/project/src/${name}`;
    this.files = [];
    this.molecules = [];
    this.exports = [];
    this.imports = [];
    this.metrics = {
      totalFunctions: 0,
      totalFiles: 0,
      complexity: 0
    };
  }

  static create(name = 'test-module') {
    return new ModuleBuilder(name);
  }

  withPath(path) {
    this.modulePath = path;
    return this;
  }

  withFile(filePath, options = {}) {
    const file = {
      path: filePath,
      atomCount: options.atomCount || 0,
      exports: options.exports || [],
      hasSideEffects: options.hasSideEffects || false,
      ...options
    };
    this.files.push(file);
    this.metrics.totalFiles = this.files.length;
    return this;
  }

  withMolecule(filePath, atoms = []) {
    const molecule = {
      filePath,
      atomCount: atoms.length,
      atoms: atoms.map((a, i) => ({
        name: a.name || `atom${i}`,
        isExported: a.isExported || false,
        isAsync: a.isAsync || false,
        hasSideEffects: a.hasSideEffects || false,
        hasNetworkCalls: a.hasNetworkCalls || false,
        hasDomManipulation: a.hasDomManipulation || false,
        hasStorageAccess: a.hasStorageAccess || false,
        hasLogging: a.hasLogging || false,
        calls: a.calls || [],
        dataFlow: a.dataFlow || { outputs: [] },
        ...a
      }))
    };
    this.molecules.push(molecule);
    this.metrics.totalFunctions += atoms.length;
    return this;
  }

  withExport(name, options = {}) {
    const exp = {
      name,
      type: options.type || 'function',
      file: options.file || 'index.js',
      usedBy: options.usedBy || 0,
      ...options
    };
    this.exports.push(exp);
    return this;
  }

  withImport(moduleName, functions, options = {}) {
    const imp = {
      module: moduleName,
      functions: Array.isArray(functions) ? functions : [functions],
      count: options.count || 1,
      ...options
    };
    this.imports.push(imp);
    return this;
  }

  withMetrics(metrics) {
    this.metrics = { ...this.metrics, ...metrics };
    return this;
  }

  build() {
    return {
      moduleName: this.moduleName,
      modulePath: this.modulePath,
      files: this.files,
      molecules: this.molecules,
      exports: this.exports,
      imports: this.imports,
      metrics: this.metrics
    };
  }

  static simpleModule(name = 'simple-module') {
    return new ModuleBuilder(name)
      .withFile('index.js', { atomCount: 3, exports: ['main'] })
      .withExport('main', { type: 'function', usedBy: 2 })
      .build();
  }

  static moduleWithDependencies(name = 'module-with-deps') {
    return new ModuleBuilder(name)
      .withFile('index.js')
      .withFile('utils.js')
      .withImport('lodash', ['clone', 'merge'], { count: 5 })
      .withExport('mainFunction')
      .withExport('helperFunction')
      .build();
  }

  static complexModule(name = 'complex-module') {
    return new ModuleBuilder(name)
      .withPath('/project/src/complex')
      .withFile('index.js', { atomCount: 10, exports: ['default', 'named1', 'named2'] })
      .withFile('utils.js', { atomCount: 5 })
      .withFile('constants.js', { atomCount: 2, hasSideEffects: true })
      .withMolecule('index.js', [
        { name: 'main', isExported: true, isAsync: true },
        { name: 'helper', isExported: false }
      ])
      .withExport('default', { type: 'function', usedBy: 10 })
      .withExport('named1', { type: 'function', usedBy: 3 })
      .withExport('named2', { type: 'constant', usedBy: 1 })
      .withImport('utils', ['format', 'parse'])
      .withImport('external-lib', ['doSomething'])
      .withMetrics({ totalFunctions: 15, complexity: 8 })
      .build();
  }
}

export default ModuleBuilder;

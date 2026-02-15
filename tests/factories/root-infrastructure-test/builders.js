/**
 * @fileoverview Root Infrastructure Test Factory - Builders
 */

export class SystemMapBuilder {
  constructor() {
    this.files = {};
    this.functions = {};
    this.function_links = [];
    this.imports = {};
    this.exports = {};
    this.unresolvedImports = {};
    this.constantExports = {};
    this.enumDefinitions = {};
    this.typeDefinitions = {};
    this.objectExports = {};
    this.typeUsages = {};
    this.metadata = {
      totalFiles: 0,
      totalFunctions: 0,
      totalImports: 0,
      totalExports: 0,
      totalConstants: 0,
      totalEnums: 0,
      totalTypes: 0,
      totalSharedObjects: 0,
      entryPoints: [],
      cyclesDetected: []
    };
  }

  static create() {
    return new SystemMapBuilder();
  }

  withFile(path, options = {}) {
    this.files[path] = {
      path,
      imports: options.imports || [],
      exports: options.exports || [],
      usedBy: options.usedBy || [],
      dependsOn: options.dependsOn || [],
      calls: options.calls || [],
      identifierRefs: options.identifierRefs || [],
      ...options
    };
    this.metadata.totalFiles = Object.keys(this.files).length;
    return this;
  }

  withFunction(filePath, name, options = {}) {
    if (!this.functions[filePath]) {
      this.functions[filePath] = [];
    }
    this.functions[filePath].push({
      id: `${filePath}:${name}`,
      name,
      file: filePath,
      line: options.line || 1,
      isExported: options.isExported || false,
      isAsync: options.isAsync || false,
      calls: options.calls || [],
      ...options
    });
    this.metadata.totalFunctions = Object.values(this.functions)
      .reduce((sum, funcs) => sum + funcs.length, 0);
    return this;
  }

  withFunctionLink(from, to, options = {}) {
    this.function_links.push({
      from,
      to,
      type: options.type || 'call',
      file_from: options.fileFrom || from.split(':')[0],
      file_to: options.fileTo || to.split(':')[0],
      ...options
    });
    return this;
  }

  withImport(filePath, source, specifiers = []) {
    if (!this.files[filePath]) {
      this.withFile(filePath);
    }
    this.files[filePath].imports.push({
      source,
      specifiers: specifiers.map(spec => ({
        type: spec.type || 'named',
        imported: spec.imported || spec,
        local: spec.local || spec.imported || spec
      }))
    });
    this.metadata.totalImports++;
    return this;
  }

  withExport(filePath, name, options = {}) {
    if (!this.files[filePath]) {
      this.withFile(filePath);
    }
    this.files[filePath].exports.push({
      name,
      type: options.type || 'named',
      line: options.line || 1,
      ...options
    });
    this.metadata.totalExports++;
    return this;
  }

  withUnresolvedImport(filePath, source, options = {}) {
    if (!this.unresolvedImports[filePath]) {
      this.unresolvedImports[filePath] = [];
    }
    this.unresolvedImports[filePath].push({
      source,
      type: options.type || 'unresolved',
      severity: options.severity || 'HIGH',
      ...options
    });
    return this;
  }

  withConstant(filePath, name, options = {}) {
    if (!this.constantExports[filePath]) {
      this.constantExports[filePath] = [];
    }
    this.constantExports[filePath].push({
      name,
      line: options.line || 1,
      valueType: options.valueType || 'unknown',
      ...options
    });
    this.metadata.totalConstants = Object.values(this.constantExports)
      .reduce((sum, consts) => sum + consts.length, 0);
    return this;
  }

  withEnum(filePath, name, members = [], options = {}) {
    if (!this.enumDefinitions[filePath]) {
      this.enumDefinitions[filePath] = [];
    }
    this.enumDefinitions[filePath].push({
      name,
      members,
      line: options.line || 1,
      isExported: options.isExported !== false,
      ...options
    });
    this.metadata.totalEnums = Object.values(this.enumDefinitions)
      .reduce((sum, enums) => sum + enums.length, 0);
    return this;
  }

  withType(filePath, name, options = {}) {
    if (!this.typeDefinitions[filePath]) {
      this.typeDefinitions[filePath] = [];
    }
    this.typeDefinitions[filePath].push({
      name,
      type: options.kind || 'type',
      line: options.line || 1,
      isExported: options.isExported !== false,
      ...options
    });
    this.metadata.totalTypes = Object.values(this.typeDefinitions)
      .reduce((sum, types) => sum + types.length, 0);
    return this;
  }

  withObject(filePath, name, properties = [], options = {}) {
    if (!this.objectExports[filePath]) {
      this.objectExports[filePath] = [];
    }
    this.objectExports[filePath].push({
      name,
      properties,
      line: options.line || 1,
      isMutable: options.isMutable !== false,
      ...options
    });
    this.metadata.totalSharedObjects = Object.values(this.objectExports)
      .reduce((sum, objs) => sum + objs.length, 0);
    return this;
  }

  withTypeUsage(filePath, typeName, line = 1) {
    if (!this.typeUsages[filePath]) {
      this.typeUsages[filePath] = [];
    }
    this.typeUsages[filePath].push({ name: typeName, line });
    return this;
  }

  withCycle(cycle) {
    this.metadata.cyclesDetected.push(cycle);
    return this;
  }

  withEntryPoint(path) {
    this.metadata.entryPoints.push(path);
    return this;
  }

  build() {
    return {
      files: this.files,
      functions: this.functions,
      function_links: this.function_links,
      imports: this.imports,
      exports: this.exports,
      unresolvedImports: this.unresolvedImports,
      constantExports: this.constantExports,
      enumDefinitions: this.enumDefinitions,
      typeDefinitions: this.typeDefinitions,
      objectExports: this.objectExports,
      typeUsages: this.typeUsages,
      metadata: this.metadata
    };
  }
}

// ============================================================================
// PROJECT STRUCTURE BUILDER
// ============================================================================

export class ProjectStructureBuilder {
  constructor(rootPath = '/test-project') {
    this.rootPath = rootPath;
    this.files = new Map();
    this.packageJson = null;
    this.tsconfigJson = null;
    this.jsconfigJson = null;
  }

  static create(rootPath = '/test-project') {
    return new ProjectStructureBuilder(rootPath);
  }

  withFile(relativePath, content = '') {
    this.files.set(relativePath, {
      path: relativePath,
      content,
      isDirectory: false
    });
    return this;
  }

  withDirectory(relativePath) {
    this.files.set(relativePath, {
      path: relativePath,
      content: null,
      isDirectory: true
    });
    return this;
  }

  withPackageJson(overrides = {}) {
    this.packageJson = {
      name: 'test-project',
      version: '1.0.0',
      type: 'module',
      ...overrides
    };
    this.files.set('package.json', {
      path: 'package.json',
      content: JSON.stringify(this.packageJson, null, 2),
      isDirectory: false
    });
    return this;
  }

  withTsConfig(overrides = {}) {
    this.tsconfigJson = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        baseUrl: '.',
        paths: {
          '@/*': ['src/*']
        },
        ...overrides.compilerOptions
      },
      ...overrides
    };
    this.files.set('tsconfig.json', {
      path: 'tsconfig.json',
      content: JSON.stringify(this.tsconfigJson, null, 2),
      isDirectory: false
    });
    return this;
  }

  withJsConfig(overrides = {}) {
    this.jsconfigJson = {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['src/*']
        },
        ...overrides.compilerOptions
      },
      ...overrides
    };
    this.files.set('jsconfig.json', {
      path: 'jsconfig.json',
      content: JSON.stringify(this.jsconfigJson, null, 2),
      isDirectory: false
    });
    return this;
  }

  withJavaScriptFiles(paths) {
    paths.forEach(p => {
      this.withFile(p, `// ${p}\nexport default {};`);
    });
    return this;
  }

  withTypeScriptFiles(paths) {
    paths.forEach(p => {
      this.withFile(p, `// ${p}\nexport default {};`);
    });
    return this;
  }

  withImports(filePath, imports) {
    const content = imports
      .map(imp => `import ${imp.name} from '${imp.source}';`)
      .join('\n');
    this.withFile(filePath, content);
    return this;
  }

  withNodeModules() {
    this.withDirectory('node_modules');
    return this;
  }

  build() {
    return {
      rootPath: this.rootPath,
      files: Array.from(this.files.values()),
      packageJson: this.packageJson,
      tsconfigJson: this.tsconfigJson,
      jsconfigJson: this.jsconfigJson
    };
  }
}

// ============================================================================
// ATOMS INDEX BUILDER
// ============================================================================

export class AtomsIndexBuilder {
  constructor() {
    this.atomsByFile = {};
  }

  static create() {
    return new AtomsIndexBuilder();
  }

  withAtom(filePath, atom) {
    if (!this.atomsByFile[filePath]) {
      this.atomsByFile[filePath] = { atoms: [] };
    }
    this.atomsByFile[filePath].atoms.push({
      name: atom.name || 'unknown',
      isAsync: atom.isAsync || false,
      hasSideEffects: atom.hasSideEffects || false,
      hasNetworkCalls: atom.hasNetworkCalls || false,
      hasStorageAccess: atom.hasStorageAccess || false,
      hasLifecycleHooks: atom.hasLifecycleHooks || false,
      hasDomManipulation: atom.hasDomManipulation || false,
      archetypes: atom.archetypes || [],
      temporal: atom.temporal || {},
      calls: atom.calls || [],
      ...atom
    });
    return this;
  }

  withEventDrivenAtom(filePath, name, options = {}) {
    return this.withAtom(filePath, {
      name,
      archetypes: ['handler'],
      temporal: {
        patterns: {
          eventEmitter: options.isEmitter || false,
          eventListener: options.isListener || false
        }
      },
      ...options
    });
  }

  withLifecycleAtom(filePath, name, options = {}) {
    return this.withAtom(filePath, {
      name,
      hasLifecycleHooks: true,
      temporal: {
        patterns: {
          lifecycleHooks: options.hooks || ['mount'],
          initialization: options.hasInit || false
        }
      },
      ...options
    });
  }

  withNetworkAtom(filePath, name, options = {}) {
    return this.withAtom(filePath, {
      name,
      hasNetworkCalls: true,
      archetypes: ['service'],
      ...options
    });
  }

  withStoreAtom(filePath, name, options = {}) {
    return this.withAtom(filePath, {
      name,
      archetypes: ['store'],
      hasSideEffects: true,
      ...options
    });
  }

  build() {
    return this.atomsByFile;
  }
}

// ============================================================================
// MOCK HELPERS
// ============================================================================



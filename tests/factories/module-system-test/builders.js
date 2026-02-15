/**
 * @fileoverview Module System Test Factory - Builders
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
}

// ============================================================================
// PROJECT BUILDER
// ============================================================================

export class ProjectBuilder {
  constructor(root = '/project') {
    this.root = root;
    this.modules = [];
  }

  static create(root = '/project') {
    return new ProjectBuilder(root);
  }

  withModule(moduleBuilder) {
    this.modules.push(moduleBuilder.build());
    return this;
  }

  withModules(count, prefix = 'module') {
    for (let i = 1; i <= count; i++) {
      this.modules.push(ModuleBuilder.create(`${prefix}-${i}`).build());
    }
    return this;
  }

  withSimpleModule(name, options = {}) {
    const builder = ModuleBuilder.create(name)
      .withFile(`src/${name}/index.js`, { exports: [options.mainExport || 'main'] })
      .withExport(options.mainExport || 'main', { file: 'index.js', type: options.exportType || 'function' });
    
    if (options.withRoute) {
      builder.withFile(`src/${name}/routes.js`);
    }
    if (options.withService) {
      builder.withFile(`src/${name}/service.js`);
    }
    
    this.modules.push(builder.build());
    return this;
  }

  withApiModule(name, routes = []) {
    const builder = ModuleBuilder.create(name)
      .withFile(`src/${name}/routes.js`, { hasSideEffects: true });
    
    routes.forEach(route => {
      builder.withMolecule(`src/${name}/routes.js`, [{
        name: route.handler,
        isExported: true,
        isAsync: route.async || false,
        calls: route.calls || []
      }]);
    });
    
    this.modules.push(builder.build());
    return this;
  }

  withLayeredModules(names) {
    const layers = ['controllers', 'services', 'repositories', 'models'];
    layers.forEach(layer => {
      if (names.includes(layer)) {
        this.modules.push(ModuleBuilder.create(layer)
          .withFile(`src/${layer}/index.js`)
          .build());
      }
    });
    return this;
  }

  withConnectedModules(connections) {
    connections.forEach(([from, to, functions]) => {
      let fromModule = this.modules.find(m => m.moduleName === from);
      if (!fromModule) {
        fromModule = ModuleBuilder.create(from).build();
        this.modules.push(fromModule);
      }
      fromModule.imports.push({
        module: to,
        functions: Array.isArray(functions) ? functions : [functions],
        count: Array.isArray(functions) ? functions.length : 1
      });
    });
    return this;
  }

  build() {
    return {
      root: this.root,
      modules: this.modules
    };
  }
}

// ============================================================================
// DEPENDENCY BUILDER
// ============================================================================

export class DependencyBuilder {
  constructor() {
    this.dependencies = [];
  }

  static create() {
    return new DependencyBuilder();
  }

  add(from, to, options = {}) {
    this.dependencies.push({
      from,
      to,
      type: options.type || 'dependency',
      strength: options.strength || 'weak',
      dataFlow: options.dataFlow || { imports: [], count: 1 },
      ...options
    });
    return this;
  }

  strong(from, to, dataFlow = {}) {
    return this.add(from, to, { strength: 'strong', dataFlow });
  }

  medium(from, to, dataFlow = {}) {
    return this.add(from, to, { strength: 'medium', dataFlow });
  }

  weak(from, to, dataFlow = {}) {
    return this.add(from, to, { strength: 'weak', dataFlow });
  }

  build() {
    return this.dependencies;
  }
}

// ============================================================================
// EXPORT BUILDER
// ============================================================================

export class ExportBuilder {
  constructor(name) {
    this.name = name;
    this.type = 'function';
    this.file = 'index.js';
    this.usedBy = 0;
    this.isMain = false;
  }

  static create(name) {
    return new ExportBuilder(name);
  }

  asFunction() {
    this.type = 'function';
    return this;
  }

  asClass() {
    this.type = 'class';
    return this;
  }

  asHandler() {
    this.type = 'handler';
    return this;
  }

  asService() {
    this.type = 'service';
    return this;
  }

  from(file) {
    this.file = file;
    return this;
  }

  usedBy(count) {
    this.usedBy = count;
    return this;
  }

  markAsMain() {
    this.isMain = true;
    return this;
  }

  build() {
    return {
      name: this.name,
      type: this.type,
      file: this.file,
      usedBy: this.usedBy,
      isMain: this.isMain
    };
  }
}

// ============================================================================
// IMPORT BUILDER
// ============================================================================

export class ImportBuilder {
  constructor(module) {
    this.module = module;
    this.functions = [];
    this.count = 0;
    this.type = 'static';
  }

  static from(module) {
    return new ImportBuilder(module);
  }

  import(...functions) {
    this.functions.push(...functions);
    this.count = this.functions.length;
    return this;
  }

  asDynamic() {
    this.type = 'dynamic';
    return this;
  }

  countAs(n) {
    this.count = n;
    return this;
  }

  build() {
    return {
      module: this.module,
      functions: this.functions,
      count: this.count,
      type: this.type
    };
  }
}

// ============================================================================
// ATOM BUILDER (for molecule atoms)
// ============================================================================

export class AtomBuilder {
  constructor(name) {
    this.name = name;
    this.isExported = false;
    this.isAsync = false;
    this.hasSideEffects = false;
    this.hasNetworkCalls = false;
    this.hasDomManipulation = false;
    this.hasStorageAccess = false;
    this.hasLogging = false;
    this.calls = [];
    this.dataFlow = { outputs: [] };
  }

  static create(name) {
    return new AtomBuilder(name);
  }

  exported() {
    this.isExported = true;
    return this;
  }

  async() {
    this.isAsync = true;
    return this;
  }

  withSideEffects(...effects) {
    this.hasSideEffects = true;
    effects.forEach(effect => {
      switch (effect) {
        case 'network': this.hasNetworkCalls = true; break;
        case 'dom': this.hasDomManipulation = true; break;
        case 'storage': this.hasStorageAccess = true; break;
        case 'logging': this.hasLogging = true; break;
      }
    });
    return this;
  }

  callsExternal(name, args = []) {
    this.calls.push({
      name,
      type: 'external',
      args: args.map(a => ({ name: a }))
    });
    return this;
  }

  callsInternal(name, args = []) {
    this.calls.push({
      name,
      type: 'internal',
      args: args.map(a => ({ name: a }))
    });
    return this;
  }

  returns(value = 'return') {
    this.dataFlow.outputs.push({ type: 'return', target: value });
    return this;
  }

  mutates(target) {
    this.dataFlow.outputs.push({ type: 'mutation', target });
    return this;
  }

  build() {
    return {
      name: this.name,
      isExported: this.isExported,
      isAsync: this.isAsync,
      hasSideEffects: this.hasSideEffects,
      hasNetworkCalls: this.hasNetworkCalls,
      hasDomManipulation: this.hasDomManipulation,
      hasStorageAccess: this.hasStorageAccess,
      hasLogging: this.hasLogging,
      calls: this.calls,
      dataFlow: this.dataFlow
    };
  }
}

// ============================================================================
// ENTRY POINT BUILDER
// ============================================================================

export class EntryPointBuilder {
  constructor(type) {
    this.type = type;
    this.handler = { module: '', file: '', function: '' };
    this.middleware = [];
  }

  static api(path, method = 'GET') {
    const builder = new EntryPointBuilder('api');
    builder.path = path;
    builder.method = method;
    return builder;
  }

  static cli(command) {
    const builder = new EntryPointBuilder('cli');
    builder.command = command;
    return builder;
  }

  static event(eventName) {
    const builder = new EntryPointBuilder('event');
    builder.event = eventName;
    return builder;
  }

  static scheduled(name) {
    const builder = new EntryPointBuilder('scheduled');
    builder.name = name;
    builder.schedule = 'unknown';
    return builder;
  }

  static library(name) {
    const builder = new EntryPointBuilder('library');
    builder.name = name;
    return builder;
  }

  handledBy(module, file, func) {
    this.handler = { module, file, function: func };
    return this;
  }

  withMiddleware(name, type = 'auth') {
    this.middleware.push({ name, type });
    return this;
  }

  build() {
    const result = {
      type: this.type,
      handler: this.handler
    };

    if (this.type === 'api') {
      result.path = this.path;
      result.method = this.method;
      if (this.middleware.length) result.middleware = this.middleware;
    } else if (this.type === 'cli') {
      result.command = this.command;
    } else if (this.type === 'event') {
      result.event = this.event;
    } else if (this.type === 'scheduled') {
      result.name = this.name;
      result.schedule = this.schedule;
    } else if (this.type === 'library') {
      result.name = this.name;
    }

    return result;
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================



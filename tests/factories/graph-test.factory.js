/**
 * @fileoverview Graph Test Factory
 * 
 * Factory for creating mock data and scenarios for Graph system testing.
 * Provides builders for graphs, nodes, edges, and system maps.
 * 
 * @module tests/factories/graph-test.factory
 */

import { 
  createEmptySystemMap, 
  createFileNode, 
  createDependency, 
  createFunctionLink,
  createImpactInfo
} from '../../src/layer-a-static/graph/types.js';

// ============================================
// GraphBuilder - Main builder for graph structures
// ============================================

/**
 * Builder for creating complete graph structures
 */
export class GraphBuilder {
  constructor() {
    this.files = {};
    this.dependencies = [];
    this.functions = {};
    this.function_links = [];
    this.unresolvedImports = {};
    this.reexportChains = [];
    this.exportIndex = {};
  }

  /**
   * Add a file node to the graph
   * @param {string} path - File path
   * @param {Object} options - File node options
   * @returns {GraphBuilder}
   */
  withFile(path, options = {}) {
    const nodeBuilder = new NodeBuilder(path, options);
    this.files[path] = nodeBuilder.build();
    return this;
  }

  /**
   * Add a file node using a NodeBuilder
   * @param {NodeBuilder} nodeBuilder - Preconfigured node builder
   * @returns {GraphBuilder}
   */
  withNode(nodeBuilder) {
    const node = nodeBuilder.build();
    this.files[node.path] = node;
    return this;
  }

  /**
   * Add multiple files at once
   * @param {string[]} paths - Array of file paths
   * @returns {GraphBuilder}
   */
  withFiles(paths) {
    for (const path of paths) {
      this.withFile(path);
    }
    return this;
  }

  /**
   * Add a dependency between files
   * @param {string} from - Source file path
   * @param {string} to - Target file path
   * @param {Object} options - Dependency options
   * @returns {GraphBuilder}
   */
  withDependency(from, to, options = {}) {
    const edgeBuilder = new EdgeBuilder(from, to, options);
    this.dependencies.push(edgeBuilder.build());
    
    // Update bidirectional relationships
    if (this.files[from]) {
      this.files[from].dependsOn.push(to);
    }
    if (this.files[to]) {
      this.files[to].usedBy.push(from);
    }
    
    return this;
  }

  /**
   * Create a chain of dependencies
   * @param {string[]} paths - Ordered array of file paths
   * @returns {GraphBuilder}
   */
  withDependencyChain(paths) {
    for (let i = 0; i < paths.length - 1; i++) {
      this.withDependency(paths[i], paths[i + 1]);
    }
    return this;
  }

  /**
   * Create a circular dependency
   * @param {string[]} paths - Array of file paths forming a cycle
   * @returns {GraphBuilder}
   */
  withCycle(paths) {
    if (paths.length < 2) return this;
    
    // Ensure all files exist
    for (const path of paths) {
      if (!this.files[path]) {
        this.withFile(path);
      }
    }
    
    // Create circular dependency
    for (let i = 0; i < paths.length; i++) {
      const from = paths[i];
      const to = paths[(i + 1) % paths.length];
      this.withDependency(from, to);
    }
    
    return this;
  }

  /**
   * Add a function to a file
   * @param {string} filePath - File path
   * @param {string} funcName - Function name
   * @param {Object} options - Function options
   * @returns {GraphBuilder}
   */
  withFunction(filePath, funcName, options = {}) {
    if (!this.functions[filePath]) {
      this.functions[filePath] = [];
    }
    
    const func = {
      id: `${filePath}::${funcName}`,
      name: funcName,
      file: filePath,
      line: options.line || 1,
      isExported: options.isExported || false,
      isAsync: options.isAsync || false,
      calls: options.calls || [],
      ...options
    };
    
    this.functions[filePath].push(func);
    return this;
  }

  /**
   * Add a function link
   * @param {string} fromFuncId - Source function ID
   * @param {string} toFuncId - Target function ID
   * @param {Object} options - Link options
   * @returns {GraphBuilder}
   */
  withFunctionLink(fromFuncId, toFuncId, options = {}) {
    const link = createFunctionLink(fromFuncId, toFuncId, {
      line: options.line,
      fileFrom: options.fileFrom,
      fileTo: options.fileTo
    });
    this.function_links.push(link);
    return this;
  }

  /**
   * Add unresolved imports for a file
   * @param {string} filePath - File path
   * @param {string[]} imports - Array of unresolved import sources
   * @returns {GraphBuilder}
   */
  withUnresolvedImports(filePath, imports) {
    this.unresolvedImports[filePath] = imports.map(source => ({
      source,
      type: 'unresolved',
      reason: 'Module not found',
      severity: 'HIGH'
    }));
    return this;
  }

  /**
   * Set transitive dependencies for a file
   * @param {string} filePath - File path
   * @param {string[]} deps - Transitive dependencies
   * @returns {GraphBuilder}
   */
  withTransitiveDependencies(filePath, deps) {
    if (this.files[filePath]) {
      this.files[filePath].transitiveDepends = deps;
    }
    return this;
  }

  /**
   * Set transitive dependents for a file
   * @param {string} filePath - File path
   * @param {string[]} dependents - Transitive dependents
   * @returns {GraphBuilder}
   */
  withTransitiveDependents(filePath, dependents) {
    if (this.files[filePath]) {
      this.files[filePath].transitiveDependents = dependents;
    }
    return this;
  }

  /**
   * Add export to export index
   * @param {string} filePath - File path
   * @param {string} name - Export name
   * @param {Object} options - Export options
   * @returns {GraphBuilder}
   */
  withExport(filePath, name, options = {}) {
    if (!this.exportIndex[filePath]) {
      this.exportIndex[filePath] = {};
    }
    
    this.exportIndex[filePath][name] = {
      type: options.type || 'direct',
      sourceFile: options.sourceFile || filePath,
      sourceName: options.sourceName || name
    };
    
    return this;
  }

  /**
   * Build the complete graph structure
   * @returns {Object} Graph structure
   */
  build() {
    return {
      files: this.files,
      dependencies: this.dependencies,
      functions: this.functions,
      function_links: this.function_links,
      unresolvedImports: this.unresolvedImports,
      reexportChains: this.reexportChains,
      exportIndex: this.exportIndex
    };
  }

  /**
   * Build as a complete SystemMap
   * @returns {SystemMap}
   */
  buildSystemMap() {
    const systemMap = createEmptySystemMap();
    systemMap.files = this.files;
    systemMap.dependencies = this.dependencies;
    systemMap.functions = this.functions;
    systemMap.function_links = this.function_links;
    systemMap.unresolvedImports = this.unresolvedImports;
    systemMap.reexportChains = this.reexportChains;
    systemMap.exportIndex = this.exportIndex;
    
    // Update metadata
    systemMap.metadata.totalFiles = Object.keys(this.files).length;
    systemMap.metadata.totalDependencies = this.dependencies.length;
    systemMap.metadata.totalFunctionLinks = this.function_links.length;
    
    let totalFunctions = 0;
    for (const funcs of Object.values(this.functions)) {
      totalFunctions += funcs.length;
    }
    systemMap.metadata.totalFunctions = totalFunctions;
    
    const totalUnresolved = Object.values(this.unresolvedImports)
      .reduce((sum, arr) => sum + arr.length, 0);
    systemMap.metadata.totalUnresolved = totalUnresolved;
    
    return systemMap;
  }

  static create() {
    return new GraphBuilder();
  }
}

// ============================================
// NodeBuilder - Builder for graph nodes (file nodes)
// ============================================

/**
 * Builder for creating file nodes
 */
export class NodeBuilder {
  constructor(path, options = {}) {
    this.path = path;
    this.displayPath = options.displayPath || path;
    this.exports = options.exports || [];
    this.imports = options.imports || [];
    this.definitions = options.definitions || [];
    this.usedBy = options.usedBy || [];
    this.dependsOn = options.dependsOn || [];
    this.calls = options.calls || [];
    this.identifierRefs = options.identifierRefs || [];
    this.transitiveDepends = options.transitiveDepends || [];
    this.transitiveDependents = options.transitiveDependents || [];
    this.metadata = options.metadata || {};
  }

  /**
   * Set display path
   * @param {string} displayPath - Human-readable path
   * @returns {NodeBuilder}
   */
  withDisplayPath(displayPath) {
    this.displayPath = displayPath;
    return this;
  }

  /**
   * Add an export
   * @param {string} name - Export name
   * @param {string} type - Export type
   * @returns {NodeBuilder}
   */
  withExport(name, type = 'named') {
    this.exports.push({ name, type });
    return this;
  }

  /**
   * Add multiple exports
   * @param {string[]} names - Export names
   * @returns {NodeBuilder}
   */
  withExports(names) {
    for (const name of names) {
      this.withExport(name);
    }
    return this;
  }

  /**
   * Add an import
   * @param {string} source - Import source
   * @param {Object} options - Import options
   * @returns {NodeBuilder}
   */
  withImport(source, options = {}) {
    this.imports.push({
      source,
      type: options.type || 'static',
      symbols: options.symbols || [],
      line: options.line || 1
    });
    return this;
  }

  /**
   * Add a usedBy reference
   * @param {string} filePath - File that uses this file
   * @returns {NodeBuilder}
   */
  usedByFile(filePath) {
    this.usedBy.push(filePath);
    return this;
  }

  /**
   * Add a dependsOn reference
   * @param {string} filePath - File this file depends on
   * @returns {NodeBuilder}
   */
  dependsOnFile(filePath) {
    this.dependsOn.push(filePath);
    return this;
  }

  /**
   * Set transitive dependencies
   * @param {string[]} deps - Array of file paths
   * @returns {NodeBuilder}
   */
  withTransitiveDepends(deps) {
    this.transitiveDepends = deps;
    return this;
  }

  /**
   * Set transitive dependents
   * @param {string[]} dependents - Array of file paths
   * @returns {NodeBuilder}
   */
  withTransitiveDependents(dependents) {
    this.transitiveDependents = dependents;
    return this;
  }

  /**
   * Set metadata
   * @param {Object} metadata - Metadata object
   * @returns {NodeBuilder}
   */
  withMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  /**
   * Build the file node
   * @returns {FileNode}
   */
  build() {
    return createFileNode(this.path, this.displayPath, {
      exports: this.exports,
      imports: this.imports,
      definitions: this.definitions,
      calls: this.calls,
      identifierRefs: this.identifierRefs
    });
  }

  static create(path, options = {}) {
    return new NodeBuilder(path, options);
  }
}

// ============================================
// EdgeBuilder - Builder for graph edges (dependencies)
// ============================================

/**
 * Builder for creating dependencies/edges
 */
export class EdgeBuilder {
  constructor(from, to, options = {}) {
    this.from = from;
    this.to = to;
    this.type = options.type || 'import';
    this.symbols = options.symbols || [];
    this.reason = options.reason;
    this.dynamic = options.dynamic || false;
    this.confidence = options.confidence || 1.0;
  }

  /**
   * Set dependency type
   * @param {string} type - Dependency type
   * @returns {EdgeBuilder}
   */
  ofType(type) {
    this.type = type;
    return this;
  }

  /**
   * Set as dynamic import
   * @param {boolean} dynamic - Is dynamic import
   * @returns {EdgeBuilder}
   */
  asDynamic(dynamic = true) {
    this.dynamic = dynamic;
    return this;
  }

  /**
   * Add imported symbols
   * @param {string[]} symbols - Array of symbol names
   * @returns {EdgeBuilder}
   */
  withSymbols(symbols) {
    this.symbols = symbols;
    return this;
  }

  /**
   * Set confidence level
   * @param {number} confidence - Confidence value (0-1)
   * @returns {EdgeBuilder}
   */
  withConfidence(confidence) {
    this.confidence = confidence;
    return this;
  }

  /**
   * Set reason for dependency
   * @param {string} reason - Reason description
   * @returns {EdgeBuilder}
   */
  because(reason) {
    this.reason = reason;
    return this;
  }

  /**
   * Build the dependency
   * @returns {Dependency}
   */
  build() {
    return createDependency(this.from, this.to, {
      type: this.type,
      symbols: this.symbols,
      reason: this.reason,
      dynamic: this.dynamic,
      confidence: this.confidence
    });
  }

  static create(from, to, options = {}) {
    return new EdgeBuilder(from, to, options);
  }
}

// ============================================
// SystemMapBuilder - Extended builder for complete system maps
// ============================================

/**
 * Builder for creating complete SystemMap structures
 * Extends GraphBuilder with Tier 3 capabilities
 */
export class SystemMapBuilder {
  constructor() {
    this.graphBuilder = new GraphBuilder();
    this.typeDefinitions = {};
    this.enumDefinitions = {};
    this.constantExports = {};
    this.objectExports = {};
    this.typeUsages = {};
    this.metadata = {};
  }

  /**
   * Add a file node
   * @param {string} path - File path
   * @param {Object} options - File options
   * @returns {SystemMapBuilder}
   */
  withFile(path, options = {}) {
    this.graphBuilder.withFile(path, options);
    return this;
  }

  /**
   * Add multiple files at once
   * @param {string[]} paths - Array of file paths
   * @returns {SystemMapBuilder}
   */
  withFiles(paths) {
    for (const path of paths) {
      this.withFile(path);
    }
    return this;
  }

  /**
   * Add a dependency
   * @param {string} from - Source file
   * @param {string} to - Target file
   * @param {Object} options - Dependency options
   * @returns {SystemMapBuilder}
   */
  withDependency(from, to, options = {}) {
    this.graphBuilder.withDependency(from, to, options);
    return this;
  }

  /**
   * Create a cycle
   * @param {string[]} paths - Files in the cycle
   * @returns {SystemMapBuilder}
   */
  withCycle(paths) {
    this.graphBuilder.withCycle(paths);
    return this;
  }

  /**
   * Add a function
   * @param {string} filePath - File path
   * @param {string} funcName - Function name
   * @param {Object} options - Function options
   * @returns {SystemMapBuilder}
   */
  withFunction(filePath, funcName, options = {}) {
    this.graphBuilder.withFunction(filePath, funcName, options);
    return this;
  }

  /**
   * Add a function link
   * @param {string} fromFuncId - Source function ID
   * @param {string} toFuncId - Target function ID
   * @param {Object} options - Link options
   * @returns {SystemMapBuilder}
   */
  withFunctionLink(fromFuncId, toFuncId, options = {}) {
    this.graphBuilder.withFunctionLink(fromFuncId, toFuncId, options);
    return this;
  }

  /**
   * Add type definitions for a file
   * @param {string} filePath - File path
   * @param {Object[]} types - Type definitions
   * @returns {SystemMapBuilder}
   */
  withTypeDefinitions(filePath, types) {
    this.typeDefinitions[filePath] = types;
    return this;
  }

  /**
   * Add enum definitions for a file
   * @param {string} filePath - File path
   * @param {Object[]} enums - Enum definitions
   * @returns {SystemMapBuilder}
   */
  withEnumDefinitions(filePath, enums) {
    this.enumDefinitions[filePath] = enums;
    return this;
  }

  /**
   * Add constant exports for a file
   * @param {string} filePath - File path
   * @param {Object[]} constants - Constant exports
   * @returns {SystemMapBuilder}
   */
  withConstantExports(filePath, constants) {
    this.constantExports[filePath] = constants;
    return this;
  }

  /**
   * Add object exports for a file
   * @param {string} filePath - File path
   * @param {Object[]} objects - Object exports
   * @returns {SystemMapBuilder}
   */
  withObjectExports(filePath, objects) {
    this.objectExports[filePath] = objects;
    return this;
  }

  /**
   * Add type usages for a file
   * @param {string} filePath - File path
   * @param {Object[]} usages - Type usages
   * @returns {SystemMapBuilder}
   */
  withTypeUsages(filePath, usages) {
    this.typeUsages[filePath] = usages;
    return this;
  }

  /**
   * Set metadata
   * @param {Object} metadata - Metadata object
   * @returns {SystemMapBuilder}
   */
  withMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
    return this;
  }

  /**
   * Add parsed file info for building
   * @param {string} path - File path
   * @param {Object} fileInfo - Parsed file information
   * @returns {SystemMapBuilder}
   */
  withParsedFile(path, fileInfo = {}) {
    this.graphBuilder.withFile(path, fileInfo);
    
    if (fileInfo.functions) {
      for (const func of fileInfo.functions) {
        this.graphBuilder.withFunction(path, func.name, func);
      }
    }
    
    if (fileInfo.typeDefinitions) {
      this.withTypeDefinitions(path, fileInfo.typeDefinitions);
    }
    
    if (fileInfo.enumDefinitions) {
      this.withEnumDefinitions(path, fileInfo.enumDefinitions);
    }
    
    if (fileInfo.constantExports) {
      this.withConstantExports(path, fileInfo.constantExports);
    }
    
    if (fileInfo.objectExports) {
      this.withObjectExports(path, fileInfo.objectExports);
    }
    
    return this;
  }

  /**
   * Build the complete SystemMap
   * @returns {SystemMap}
   */
  build() {
    const systemMap = this.graphBuilder.buildSystemMap();
    
    systemMap.typeDefinitions = this.typeDefinitions;
    systemMap.enumDefinitions = this.enumDefinitions;
    systemMap.constantExports = this.constantExports;
    systemMap.objectExports = this.objectExports;
    systemMap.typeUsages = this.typeUsages;
    
    // Update metadata
    systemMap.metadata = {
      ...systemMap.metadata,
      ...this.metadata,
      totalTypes: this.countItems(this.typeDefinitions),
      totalEnums: this.countItems(this.enumDefinitions),
      totalConstants: this.countItems(this.constantExports),
      totalSharedObjects: this.countItems(this.objectExports)
    };
    
    return systemMap;
  }

  /**
   * Count items in a map
   * @private
   */
  countItems(itemsMap) {
    let total = 0;
    for (const items of Object.values(itemsMap)) {
      if (Array.isArray(items)) {
        total += items.length;
      }
    }
    return total;
  }

  static create() {
    return new SystemMapBuilder();
  }
}

// ============================================
// Predefined Scenarios
// ============================================

/**
 * Predefined graph scenarios for common test cases
 */
export const GraphScenarios = {
  /**
   * Empty graph
   */
  empty: () => GraphBuilder.create().build(),

  /**
   * Single file with no dependencies
   */
  singleFile: () => GraphBuilder.create()
    .withFile('src/index.js')
    .build(),

  /**
   * Linear dependency chain: A -> B -> C -> D
   */
  linearChain: () => GraphBuilder.create()
    .withFiles(['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'])
    .withDependencyChain(['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'])
    .build(),

  /**
   * Simple cycle: A -> B -> C -> A
   */
  simpleCycle: () => GraphBuilder.create()
    .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
    .build(),

  /**
   * Multiple cycles
   */
  multipleCycles: () => GraphBuilder.create()
    .withCycle(['src/a.js', 'src/b.js', 'src/c.js'])
    .withCycle(['src/d.js', 'src/e.js', 'src/f.js'])
    .build(),

  /**
   * Diamond dependency: A -> B, A -> C, B -> D, C -> D
   */
  diamond: () => GraphBuilder.create()
    .withFiles(['src/a.js', 'src/b.js', 'src/c.js', 'src/d.js'])
    .withDependency('src/a.js', 'src/b.js')
    .withDependency('src/a.js', 'src/c.js')
    .withDependency('src/b.js', 'src/d.js')
    .withDependency('src/c.js', 'src/d.js')
    .build(),

  /**
   * Star pattern: center file used by many
   */
  star: () => {
    const builder = GraphBuilder.create().withFile('src/utils.js');
    for (let i = 0; i < 10; i++) {
      builder.withFile(`src/feature${i}.js`);
      builder.withDependency(`src/feature${i}.js`, 'src/utils.js');
    }
    return builder.build();
  },

  /**
   * Deep tree structure
   */
  deepTree: () => GraphBuilder.create()
    .withFiles([
      'src/root.js',
      'src/level1/a.js',
      'src/level1/b.js',
      'src/level2/a1.js',
      'src/level2/a2.js',
      'src/level2/b1.js',
      'src/level3/leaf.js'
    ])
    .withDependency('src/root.js', 'src/level1/a.js')
    .withDependency('src/root.js', 'src/level1/b.js')
    .withDependency('src/level1/a.js', 'src/level2/a1.js')
    .withDependency('src/level1/a.js', 'src/level2/a2.js')
    .withDependency('src/level1/b.js', 'src/level2/b1.js')
    .withDependency('src/level2/a1.js', 'src/level3/leaf.js')
    .withDependency('src/level2/a2.js', 'src/level3/leaf.js')
    .build(),

  /**
   * Self-cycle: A -> A
   */
  selfCycle: () => GraphBuilder.create()
    .withFile('src/a.js')
    .withDependency('src/a.js', 'src/a.js')
    .build(),

  /**
   * Complex graph with multiple patterns
   */
  complex: () => GraphBuilder.create()
    .withFiles([
      'src/main.js',
      'src/utils.js',
      'src/helpers.js',
      'src/core/a.js',
      'src/core/b.js',
      'src/features/x.js',
      'src/features/y.js'
    ])
    .withDependency('src/main.js', 'src/utils.js')
    .withDependency('src/main.js', 'src/helpers.js')
    .withDependency('src/main.js', 'src/core/a.js')
    .withDependency('src/utils.js', 'src/helpers.js')
    .withDependency('src/helpers.js', 'src/core/a.js')
    .withDependency('src/helpers.js', 'src/core/b.js')
    .withDependency('src/features/x.js', 'src/utils.js')
    .withDependency('src/features/y.js', 'src/utils.js')
    .withDependency('src/features/x.js', 'src/core/a.js')
    .withDependency('src/features/y.js', 'src/core/b.js')
    .build()
};

// ============================================
// Factory Helper Class
// ============================================

/**
 * Main factory for creating graph test data
 */
export class GraphTestFactory {
  /**
   * Create a graph scenario
   * @param {string} name - Scenario name
   * @returns {Object} Graph structure
   */
  static createScenario(name) {
    return GraphScenarios[name] ? GraphScenarios[name]() : GraphScenarios.empty();
  }

  /**
   * Create a SystemMap with specific file count
   * @param {number} fileCount - Number of files
   * @returns {SystemMap}
   */
  static createSystemMapWithFiles(fileCount) {
    const builder = SystemMapBuilder.create();
    for (let i = 0; i < fileCount; i++) {
      builder.withFile(`src/file${i}.js`);
    }
    return builder.build();
  }

  /**
   * Create a SystemMap with a dependency chain
   * @param {number} length - Length of the chain
   * @returns {SystemMap}
   */
  static createChain(length) {
    const paths = Array.from({ length }, (_, i) => `src/file${i}.js`);
    return SystemMapBuilder.create()
      .withDependencyChain(paths)
      .build();
  }

  /**
   * Create a SystemMap with cycles
   * @param {number} cycleCount - Number of cycles
   * @param {number} cycleSize - Size of each cycle
   * @returns {SystemMap}
   */
  static createWithCycles(cycleCount, cycleSize = 3) {
    const builder = SystemMapBuilder.create();
    for (let i = 0; i < cycleCount; i++) {
      const paths = Array.from({ length: cycleSize }, (_, j) => `src/cycle${i}/file${j}.js`);
      builder.withCycle(paths);
    }
    return builder.build();
  }

  /**
   * Create a SystemMap with functions
   * @param {Object} config - { filePath: functionCount }
   * @returns {SystemMap}
   */
  static createWithFunctions(config) {
    const builder = SystemMapBuilder.create();
    for (const [filePath, count] of Object.entries(config)) {
      builder.withFile(filePath);
      for (let i = 0; i < count; i++) {
        builder.withFunction(filePath, `func${i}`, { line: i * 10 + 1 });
      }
    }
    return builder.build();
  }

  /**
   * Create impact info for testing
   * @param {string} filePath - File path
   * @param {Object} options - Impact options
   * @returns {ImpactInfo}
   */
  static createImpactInfo(filePath, options = {}) {
    const fileNode = createFileNode(filePath, filePath, {});
    fileNode.usedBy = options.directDependents || [];
    fileNode.transitiveDependents = options.indirectDependents || [];
    return createImpactInfo(filePath, fileNode);
  }
}

export default GraphTestFactory;

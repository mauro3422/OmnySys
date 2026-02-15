/**
 * @fileoverview Query Test Factory
 * 
 * Factory for creating test data and mock objects for Query system testing.
 * Provides builders for project data, file structures, connections, and queries.
 * 
 * @module tests/factories/query-test
 */

import { describe, it, expect } from 'vitest';

/**
 * Builder for creating mock project data structures
 */
export class ProjectDataBuilder {
  constructor() {
    this.metadata = {
      version: '1.0.0',
      analyzedAt: new Date().toISOString(),
      projectRoot: '/test/project',
      config: {}
    };
    this.files = [];
    this.fileIndex = {};
    this.stats = {
      totalFiles: 0,
      totalAtoms: 0,
      totalConnections: 0
    };
  }

  static create() {
    return new ProjectDataBuilder();
  }

  withVersion(version) {
    this.metadata.version = version;
    return this;
  }

  withProjectRoot(root) {
    this.metadata.projectRoot = root;
    return this;
  }

  withAnalyzedAt(date) {
    this.metadata.analyzedAt = date instanceof Date ? date.toISOString() : date;
    return this;
  }

  withConfig(config) {
    this.metadata.config = { ...this.metadata.config, ...config };
    return this;
  }

  withFile(filePath, fileData = {}) {
    this.files.push(filePath);
    this.fileIndex[filePath] = {
      hash: fileData.hash || `hash-${Date.now()}`,
      lastModified: fileData.lastModified || new Date().toISOString(),
      size: fileData.size || 0,
      ...fileData
    };
    this.stats.totalFiles = this.files.length;
    return this;
  }

  withFiles(filePaths) {
    for (const path of filePaths) {
      this.withFile(path);
    }
    return this;
  }

  withStats(stats) {
    this.stats = { ...this.stats, ...stats };
    return this;
  }

  build() {
    return {
      metadata: this.metadata,
      files: this.files,
      fileIndex: this.fileIndex,
      stats: this.stats
    };
  }
}

/**
 * Builder for creating file analysis data structures
 */
export class FileDataBuilder {
  constructor(filePath = 'test.js') {
    this.filePath = filePath;
    this.data = {
      path: filePath,
      hash: `hash-${Date.now()}`,
      atoms: [],
      atomIds: [],
      imports: [],
      exports: [],
      usedBy: [],
      complexity: 0,
      lines: 0,
      metadata: {}
    };
  }

  static create(filePath) {
    return new FileDataBuilder(filePath);
  }

  withPath(path) {
    this.filePath = path;
    this.data.path = path;
    return this;
  }

  withHash(hash) {
    this.data.hash = hash;
    return this;
  }

  withAtom(atom) {
    const atomData = {
      id: atom.id || `${this.filePath}::${atom.name}`,
      name: atom.name,
      type: atom.type || 'function',
      line: atom.line || 1,
      column: atom.column || 0,
      isExported: atom.isExported || false,
      complexity: atom.complexity || 1,
      archetype: atom.archetype || null,
      ...atom
    };
    this.data.atoms.push(atomData);
    this.data.atomIds.push(atomData.id);
    return this;
  }

  withAtoms(atoms) {
    for (const atom of atoms) {
      this.withAtom(atom);
    }
    return this;
  }

  withImport(source, options = {}) {
    this.data.imports.push({
      source,
      line: options.line || 1,
      resolvedPath: options.resolvedPath || null,
      type: options.type || 'static',
      ...options
    });
    return this;
  }

  withImports(imports) {
    for (const imp of imports) {
      if (typeof imp === 'string') {
        this.withImport(imp);
      } else {
        this.withImport(imp.source, imp);
      }
    }
    return this;
  }

  withExport(name, options = {}) {
    this.data.exports.push({
      name,
      line: options.line || 1,
      type: options.type || 'named',
      ...options
    });
    return this;
  }

  withExports(exports) {
    for (const exp of exports) {
      if (typeof exp === 'string') {
        this.withExport(exp);
      } else {
        this.withExport(exp.name, exp);
      }
    }
    return this;
  }

  withUsedBy(files) {
    this.data.usedBy = Array.isArray(files) ? files : [files];
    return this;
  }

  withComplexity(complexity) {
    this.data.complexity = complexity;
    return this;
  }

  withLines(lines) {
    this.data.lines = lines;
    return this;
  }

  withMetadata(metadata) {
    this.data.metadata = { ...this.data.metadata, ...metadata };
    return this;
  }

  build() {
    return this.data;
  }
}

/**
 * Builder for creating connection data structures
 */
export class ConnectionBuilder {
  constructor() {
    this.sharedState = [];
    this.eventListeners = [];
  }

  static create() {
    return new ConnectionBuilder();
  }

  withSharedStateConnection(connection) {
    this.sharedState.push({
      source: connection.source,
      target: connection.target,
      type: connection.type || 'shared-state',
      variable: connection.variable || 'unknown',
      line: connection.line || 1,
      ...connection
    });
    return this;
  }

  withEventListener(connection) {
    this.eventListeners.push({
      source: connection.source,
      target: connection.target,
      type: connection.type || 'event-listener',
      event: connection.event || 'click',
      line: connection.line || 1,
      ...connection
    });
    return this;
  }

  withConnection(connection) {
    if (connection.type === 'shared-state' || connection.variable) {
      return this.withSharedStateConnection(connection);
    }
    return this.withEventListener(connection);
  }

  withSharedState(count = 1) {
    for (let i = 0; i < count; i++) {
      this.withSharedStateConnection({
        source: `src/file${i}.js`,
        target: `src/file${i + 1}.js`,
        variable: `state${i}`,
        line: i + 1
      });
    }
    return this;
  }

  withEventListeners(count = 1) {
    for (let i = 0; i < count; i++) {
      this.withEventListener({
        source: `src/component${i}.js`,
        target: `src/handler${i}.js`,
        event: `event${i}`,
        line: i + 1
      });
    }
    return this;
  }

  build() {
    return {
      sharedState: this.sharedState,
      eventListeners: this.eventListeners,
      total: this.sharedState.length + this.eventListeners.length
    };
  }
}

/**
 * Builder for creating query test scenarios
 */
export class QueryBuilder {
  constructor() {
    this.projectRoot = '/test/project';
    this.files = new Map();
    this.connections = { sharedState: [], eventListeners: [], total: 0 };
    this.risks = {
      report: {
        summary: { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, totalFiles: 0 },
        criticalRiskFiles: [],
        highRiskFiles: [],
        mediumRiskFiles: []
      },
      scores: {}
    };
    this.metadata = null;
  }

  static create() {
    return new QueryBuilder();
  }

  atProjectRoot(root) {
    this.projectRoot = root;
    return this;
  }

  withFile(filePath, fileData) {
    const builder = fileData instanceof FileDataBuilder 
      ? fileData 
      : FileDataBuilder.create(filePath).withMetadata(fileData || {});
    this.files.set(filePath, builder.build());
    return this;
  }

  withFiles(fileMap) {
    for (const [path, data] of Object.entries(fileMap)) {
      this.withFile(path, data);
    }
    return this;
  }

  withConnections(connectionBuilder) {
    if (connectionBuilder instanceof ConnectionBuilder) {
      this.connections = connectionBuilder.build();
    } else {
      this.connections = connectionBuilder;
    }
    return this;
  }

  withRisks(risks) {
    this.risks = { ...this.risks, ...risks };
    return this;
  }

  withMetadata(metadata) {
    this.metadata = metadata;
    return this;
  }

  build() {
    return {
      projectRoot: this.projectRoot,
      files: Object.fromEntries(this.files),
      connections: this.connections,
      risks: this.risks,
      metadata: this.metadata || ProjectDataBuilder.create()
        .withProjectRoot(this.projectRoot)
        .withFiles(Array.from(this.files.keys()))
        .build()
    };
  }
}

/**
 * Factory for creating common query test scenarios
 */
export class QueryScenarios {
  static emptyProject() {
    return QueryBuilder.create().build();
  }

  static singleFileProject(filePath = 'src/index.js') {
    return QueryBuilder.create()
      .withFile(filePath, FileDataBuilder.create(filePath)
        .withAtom({ name: 'main', type: 'function', line: 1 })
        .build())
      .build();
  }

  static multiFileProject(fileCount = 3) {
    const builder = QueryBuilder.create();
    for (let i = 0; i < fileCount; i++) {
      builder.withFile(`src/file${i}.js`, FileDataBuilder.create(`src/file${i}.js`)
        .withAtom({ name: `func${i}`, type: 'function', line: 1 })
        .build());
    }
    return builder.build();
  }

  static projectWithImports() {
    return QueryBuilder.create()
      .withFile('src/main.js', FileDataBuilder.create('src/main.js')
        .withImport('./utils.js', { resolvedPath: 'src/utils.js', line: 1 })
        .withAtom({ name: 'main', type: 'function', line: 5 })
        .build())
      .withFile('src/utils.js', FileDataBuilder.create('src/utils.js')
        .withExport('helper', { line: 1 })
        .withAtom({ name: 'helper', type: 'function', line: 1, isExported: true })
        .withUsedBy(['src/main.js'])
        .build())
      .build();
  }

  static projectWithConnections() {
    return QueryBuilder.create()
      .withFile('src/store.js', FileDataBuilder.create('src/store.js')
        .withAtom({ name: 'state', type: 'variable', line: 1 })
        .build())
      .withFile('src/component.js', FileDataBuilder.create('src/component.js')
        .withAtom({ name: 'render', type: 'function', line: 1 })
        .build())
      .withConnections(ConnectionBuilder.create()
        .withSharedStateConnection({
          source: 'src/store.js',
          target: 'src/component.js',
          variable: 'appState',
          line: 5
        }))
      .build();
  }

  static projectWithRisks() {
    return QueryBuilder.create()
      .withFile('src/critical.js', FileDataBuilder.create('src/critical.js')
        .withComplexity(50)
        .withAtom({ name: 'complexFunc', type: 'function', line: 1, complexity: 50 })
        .build())
      .withRisks({
        report: {
          summary: { criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, totalFiles: 1 },
          criticalRiskFiles: [{ file: 'src/critical.js', reason: 'High complexity' }],
          highRiskFiles: [],
          mediumRiskFiles: []
        },
        scores: { 'src/critical.js': 95 }
      })
      .build();
  }

  static projectWithAtoms() {
    return QueryBuilder.create()
      .withFile('src/atoms.js', FileDataBuilder.create('src/atoms.js')
        .withAtom({ 
          name: 'exportedFunc', 
          type: 'function', 
          line: 1, 
          isExported: true,
          complexity: 5,
          archetype: { type: 'hot-path', confidence: 0.8 }
        })
        .withAtom({ 
          name: 'internalFunc', 
          type: 'function', 
          line: 10, 
          isExported: false,
          complexity: 2
        })
        .withAtom({ 
          name: 'deadFunc', 
          type: 'function', 
          line: 20, 
          isExported: false,
          archetype: { type: 'dead-function', confidence: 0.9 }
        })
        .build())
      .build();
  }

  static circularDependency() {
    return QueryBuilder.create()
      .withFile('src/a.js', FileDataBuilder.create('src/a.js')
        .withImport('./b.js', { resolvedPath: 'src/b.js' })
        .build())
      .withFile('src/b.js', FileDataBuilder.create('src/b.js')
        .withImport('./a.js', { resolvedPath: 'src/a.js' })
        .build())
      .build();
  }

  static deepDependencyTree(depth = 3) {
    const builder = QueryBuilder.create();
    for (let i = 0; i < depth; i++) {
      const nextFile = i < depth - 1 ? `src/level${i + 1}.js` : null;
      builder.withFile(`src/level${i}.js`, FileDataBuilder.create(`src/level${i}.js`)
        .withImport(nextFile ? `./level${i + 1}.js` : './leaf.js', 
          nextFile ? { resolvedPath: nextFile } : { resolvedPath: 'src/leaf.js' })
        .build());
    }
    builder.withFile('src/leaf.js', FileDataBuilder.create('src/leaf.js').build());
    return builder.build();
  }
}

/**
 * Mock factory for filesystem operations
 */
export class MockFileSystem {
  constructor() {
    this.files = new Map();
    this.directories = new Set();
  }

  static create() {
    return new MockFileSystem();
  }

  withFile(path, content) {
    this.files.set(path, typeof content === 'string' ? content : JSON.stringify(content));
    return this;
  }

  withDirectory(path) {
    this.directories.add(path);
    return this;
  }

  withJSON(path, data) {
    return this.withFile(path, JSON.stringify(data, null, 2));
  }

  exists(path) {
    return this.files.has(path) || this.directories.has(path);
  }

  readFile(path) {
    return this.files.get(path) || null;
  }

  readJSON(path) {
    const content = this.readFile(path);
    return content ? JSON.parse(content) : null;
  }

  build() {
    return {
      exists: (path) => this.exists(path),
      readFile: (path) => this.readFile(path),
      readJSON: (path) => this.readJSON(path),
      files: Object.fromEntries(this.files),
      directories: Array.from(this.directories)
    };
  }
}

/**
 * Validation helpers for query results
 */
export class QueryValidators {
  static isValidProjectMetadata(metadata) {
    return metadata && 
           typeof metadata === 'object' &&
           'version' in metadata &&
           'analyzedAt' in metadata &&
           'projectRoot' in metadata;
  }

  static isValidFileAnalysis(analysis) {
    return analysis && 
           typeof analysis === 'object' &&
           'path' in analysis;
  }

  static isValidConnection(connection) {
    return connection &&
           typeof connection === 'object' &&
           'source' in connection &&
           'target' in connection &&
           typeof connection.source === 'string' &&
           typeof connection.target === 'string';
  }

  static isValidConnectionsResult(result) {
    return result &&
           typeof result === 'object' &&
           Array.isArray(result.sharedState) &&
           Array.isArray(result.eventListeners) &&
           typeof result.total === 'number';
  }

  static isValidRiskAssessment(assessment) {
    return assessment &&
           typeof assessment === 'object' &&
           'report' in assessment &&
           'scores' in assessment;
  }

  static isValidDependencyGraph(graph) {
    return graph &&
           typeof graph === 'object' &&
           Array.isArray(graph.nodes) &&
           Array.isArray(graph.edges);
  }

  static hasRequiredFields(obj, fields) {
    if (!obj || typeof obj !== 'object') return false;
    return fields.every(field => field in obj);
  }
}

/**
 * Test data constants
 */
export const QueryTestConstants = {
  TEST_PROJECT_ROOT: '/test/project',
  VALID_FILE_PATHS: [
    'src/index.js',
    'src/utils.js',
    'src/components/Button.js',
    'lib/helpers.ts'
  ],
  INVALID_FILE_PATHS: [
    '',
    null,
    undefined,
    123
  ],
  ARCHETYPE_TYPES: [
    'dead-function',
    'hot-path',
    'fragile-network',
    'stateful',
    'pure-function',
    'side-effect'
  ],
  CONNECTION_TYPES: [
    'shared-state',
    'event-listener',
    'callback',
    'promise-chain'
  ],
  SEVERITY_LEVELS: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
};

/**
 * Error scenarios for testing error handling
 */
export class ErrorScenarios {
  static fileNotFound(path) {
    return new Error(`ENOENT: no such file or directory, open '${path}'`);
  }

  static invalidJSON(path) {
    return new Error(`Failed to read ${path}: Unexpected token`);
  }

  static permissionDenied(path) {
    return new Error(`EACCES: permission denied, open '${path}'`);
  }

  static circularDependency(path) {
    return new Error(`Circular dependency detected at ${path}`);
  }
}

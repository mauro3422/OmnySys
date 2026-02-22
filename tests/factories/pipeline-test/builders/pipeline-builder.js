/**
 * @fileoverview Pipeline Builder - For pipeline configuration scenarios
 */

export class PipelineBuilder {
  constructor() {
    this.config = {
      rootPath: '/test/project',
      verbose: false,
      incremental: false,
      batchSize: 20,
      phases: ['parse', 'resolve', 'extract', 'enhance', 'save'],
      options: {}
    };
    this.mockFiles = new Map();
    this.mockImports = new Map();
  }

  withRootPath(path) {
    this.config.rootPath = path;
    return this;
  }

  withVerbose(verbose = true) {
    this.config.verbose = verbose;
    return this;
  }

  withIncremental(incremental = true) {
    this.config.incremental = incremental;
    return this;
  }

  withBatchSize(size) {
    this.config.batchSize = size;
    return this;
  }

  withPhases(phases) {
    this.config.phases = phases;
    return this;
  }

  withOption(key, value) {
    this.config.options[key] = value;
    return this;
  }

  addMockFile(filePath, content = '', metadata = {}) {
    this.mockFiles.set(filePath, {
      content,
      metadata: {
        size: content.length,
        modifiedAt: new Date().toISOString(),
        ...metadata
      }
    });
    return this;
  }

  addMockImport(source, resolved, type = 'local') {
    this.mockImports.set(source, { resolved, type });
    return this;
  }

  build() {
    return {
      ...this.config,
      mockFiles: Object.fromEntries(this.mockFiles),
      mockImports: Object.fromEntries(this.mockImports)
    };
  }

  buildSystemMap(overrides = {}) {
    return {
      metadata: {
        totalFiles: 10,
        totalFunctions: 50,
        totalDependencies: 25,
        totalFunctionLinks: 40,
        cyclesDetected: [],
        analyzedAt: new Date().toISOString(),
        ...overrides.metadata
      },
      files: {},
      dependencies: {},
      ...overrides
    };
  }
}

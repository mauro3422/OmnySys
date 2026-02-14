/**
 * @fileoverview Detector Test Factory
 * 
 * Factory for creating mock data for Tier 3 detector testing.
 * 
 * @module tests/factories/detector-test.factory
 */

/**
 * Builder for creating system map mock data
 */
export class SystemMapBuilder {
  constructor() {
    this.files = {};
    this.functions = {};
    this.resolutions = {};
  }

  withFile(path, content = {}) {
    this.files[path] = {
      imports: [],
      exports: [],
      ...content
    };
    return this;
  }

  withFunction(filePath, name, options = {}) {
    const {
      line = 1,
      isExported = false,
      calls = [],
      usedBy = [],
      isAsync = false
    } = options;

    if (!this.functions[filePath]) {
      this.functions[filePath] = [];
    }

    this.functions[filePath].push({
      name,
      line,
      isExported,
      calls,
      usedBy,
      isAsync
    });

    return this;
  }

  withImport(filePath, source, options = {}) {
    const { type = 'static', line = 1 } = options;
    
    if (!this.files[filePath]) {
      this.files[filePath] = { imports: [], exports: [] };
    }
    
    this.files[filePath].imports.push({
      source,
      type,
      line
    });
    
    return this;
  }

  withDynamicImport(filePath, source, options = {}) {
    return this.withImport(filePath, source, { ...options, type: 'dynamic' });
  }

  withUnresolvedImport(filePath, source, options = {}) {
    if (!this.resolutions[filePath]) {
      this.resolutions[filePath] = {};
    }
    this.resolutions[filePath][source] = { type: 'unresolved' };
    return this.withDynamicImport(filePath, source, options);
  }

  withResolution(filePath, source, resolvedPath) {
    if (!this.resolutions[filePath]) {
      this.resolutions[filePath] = {};
    }
    this.resolutions[filePath][source] = { type: 'resolved', path: resolvedPath };
    return this;
  }

  build() {
    return {
      files: this.files,
      functions: this.functions,
      resolutions: this.resolutions
    };
  }

  static create() {
    return new SystemMapBuilder();
  }
}

/**
 * Builder for creating advanced analysis mock data
 */
export class AdvancedAnalysisBuilder {
  constructor() {
    this.fileResults = {};
  }

  withFile(path, analysis = {}) {
    this.fileResults[path] = {
      webWorkers: { outgoing: [], incoming: [] },
      networkCalls: { urls: [] },
      webSocket: { urls: [] },
      ...analysis
    };
    return this;
  }

  withWorker(filePath, workerPath, options = {}) {
    const { line = 1, type = 'worker_creation' } = options;
    
    if (!this.fileResults[filePath]) {
      this.fileResults[filePath] = { webWorkers: { outgoing: [], incoming: [] } };
    }
    if (!this.fileResults[filePath].webWorkers) {
      this.fileResults[filePath].webWorkers = { outgoing: [], incoming: [] };
    }
    if (!this.fileResults[filePath].webWorkers.outgoing) {
      this.fileResults[filePath].webWorkers.outgoing = [];
    }
    
    this.fileResults[filePath].webWorkers.outgoing.push({
      workerPath,
      line,
      type
    });
    
    return this;
  }

  withNetworkUrl(filePath, url, options = {}) {
    const { line = 1 } = options;
    
    if (!this.fileResults[filePath]) {
      this.fileResults[filePath] = { networkCalls: { urls: [] } };
    }
    if (!this.fileResults[filePath].networkCalls) {
      this.fileResults[filePath].networkCalls = { urls: [] };
    }
    
    this.fileResults[filePath].networkCalls.urls.push({ url, line });
    
    return this;
  }

  withWebSocketUrl(filePath, url, options = {}) {
    const { line = 1 } = options;
    
    if (!this.fileResults[filePath]) {
      this.fileResults[filePath] = { webSocket: { urls: [] } };
    }
    if (!this.fileResults[filePath].webSocket) {
      this.fileResults[filePath].webSocket = { urls: [] };
    }
    
    this.fileResults[filePath].webSocket.urls.push({ url, line });
    
    return this;
  }

  build() {
    return {
      fileResults: this.fileResults
    };
  }

  static create() {
    return new AdvancedAnalysisBuilder();
  }
}

/**
 * Predefined scenarios for common test cases
 */
export const DetectorScenarios = {
  /**
   * Dead code scenario: function never called
   */
  deadCode: () => SystemMapBuilder.create()
    .withFile('src/utils.js')
    .withFunction('src/utils.js', 'unusedHelper', { line: 10 })
    .withFunction('src/utils.js', 'usedHelper', { 
      line: 20, 
      usedBy: ['src/main.js'],
      isExported: true 
    })
    .build(),

  /**
   * Dead code with event handlers (should be excluded)
   */
  deadCodeWithHandlers: () => SystemMapBuilder.create()
    .withFile('src/components.js')
    .withFunction('src/components.js', 'onClick', { line: 5 })
    .withFunction('src/components.js', 'handleSubmit', { line: 10 })
    .withFunction('src/components.js', 'initApp', { line: 15 })
    .build(),

  /**
   * Broken worker scenario
   */
  brokenWorker: () => ({
    systemMap: SystemMapBuilder.create()
      .withFile('src/main.js')
      .withFile('src/workers/valid-worker.js')
      .build(),
    advancedAnalysis: AdvancedAnalysisBuilder.create()
      .withWorker('src/main.js', './missing-worker.js', { line: 10 })
      .withWorker('src/main.js', './workers/valid-worker.js', { line: 20 })
      .build()
  }),

  /**
   * Broken dynamic import scenario
   */
  brokenDynamicImport: () => SystemMapBuilder.create()
    .withFile('src/main.js')
    .withFile('src/modules/exists.js')
    .withUnresolvedImport('src/main.js', './modules/missing.js')
    .withDynamicImport('src/main.js', './modules/exists.js')
    .withResolution('src/main.js', './modules/exists.js', 'src/modules/exists.js')
    .build(),

  /**
   * Duplicate functions scenario
   */
  duplicateFunctions: () => SystemMapBuilder.create()
    .withFile('src/a.js')
    .withFile('src/b.js')
    .withFile('src/c.js')
    .withFunction('src/a.js', 'formatDate', { line: 5 })
    .withFunction('src/b.js', 'formatDate', { line: 8 })
    .withFunction('src/c.js', 'formatDate', { line: 12 })
    .withFunction('src/a.js', 'handleClick', { line: 20 }) // common name, should be ignored
    .withFunction('src/b.js', 'handleClick', { line: 25 })
    .build(),

  /**
   * Suspicious URLs scenario
   */
  suspiciousUrls: () => AdvancedAnalysisBuilder.create()
    .withNetworkUrl('src/api.js', 'http://localhost:3000/api', { line: 10 })
    .withNetworkUrl('src/api.js', 'https://api.production.com/v1', { line: 20 })
    .withWebSocketUrl('src/realtime.js', 'ws://127.0.0.1:8080', { line: 5 })
    .withNetworkUrl('src/config.js', 'http://example.com/test', { line: 15 })
    .build(),

  /**
   * Empty system map
   */
  empty: () => SystemMapBuilder.create().build(),

  /**
   * Complex scenario with multiple issues
   */
  complex: () => ({
    systemMap: SystemMapBuilder.create()
      .withFile('src/main.js')
      .withFile('src/utils.js')
      .withFile('src/helpers.js')
      .withFunction('src/utils.js', 'formatDate', { line: 1 })
      .withFunction('src/helpers.js', 'formatDate', { line: 1 }) // duplicate
      .withFunction('src/utils.js', 'unusedFunction', { line: 10 }) // dead code
      .withUnresolvedImport('src/main.js', './missing-module.js')
      .build(),
    advancedAnalysis: AdvancedAnalysisBuilder.create()
      .withWorker('src/main.js', './non-existent-worker.js')
      .withNetworkUrl('src/main.js', 'http://localhost:8080')
      .build()
  })
};

/**
 * Factory helper for creating detector test data
 */
export class DetectorTestFactory {
  /**
   * Create a complete test scenario
   */
  static createScenario(name) {
    return DetectorScenarios[name] ? DetectorScenarios[name]() : DetectorScenarios.empty();
  }

  /**
   * Create multiple dead functions
   */
  static createDeadFunctions(count) {
    const builder = SystemMapBuilder.create().withFile('src/utils.js');
    for (let i = 0; i < count; i++) {
      builder.withFunction('src/utils.js', `deadFunc${i}`, { line: i * 10 + 1 });
    }
    return builder.build();
  }

  /**
   * Create multiple duplicate functions
   */
  static createDuplicateFunctions(name, fileCount) {
    const builder = SystemMapBuilder.create();
    for (let i = 0; i < fileCount; i++) {
      builder.withFile(`src/file${i}.js`)
             .withFunction(`src/file${i}.js`, name, { line: 1 });
    }
    return builder.build();
  }

  /**
   * Create system map with various function types
   */
  static createMixedFunctionTypes() {
    return SystemMapBuilder.create()
      .withFile('src/app.js')
      // Dead functions
      .withFunction('src/app.js', 'unused1', { line: 1 })
      .withFunction('src/app.js', 'unused2', { line: 10 })
      // Event handlers (should not be flagged as dead)
      .withFunction('src/app.js', 'onButtonClick', { line: 20 })
      .withFunction('src/app.js', 'handleInputChange', { line: 30 })
      // Init functions (should not be flagged as dead)
      .withFunction('src/app.js', 'initializeApp', { line: 40 })
      .withFunction('src/app.js', 'setupEventListeners', { line: 50 })
      // Used functions
      .withFunction('src/app.js', 'helper', { 
        line: 60, 
        usedBy: ['src/other.js'],
        isExported: true 
      })
      .build();
  }
}

export default DetectorTestFactory;

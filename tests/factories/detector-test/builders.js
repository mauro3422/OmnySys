/**
 * @fileoverview Detector Test Factory - Builders
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


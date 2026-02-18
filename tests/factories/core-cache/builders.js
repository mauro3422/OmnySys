/**
 * @fileoverview Core Cache Factory - Builders
 *
 * Builders para testing del sistema de caché unificado y el singleton.
 * Sigue el mismo patrón que core-unified-server/builders.js
 *
 * @module tests/factories/core-cache
 */

import path from 'path';
import os from 'os';

/**
 * Builder para CacheManagerConfig
 * Genera configuraciones válidas para UnifiedCacheManager
 */
export class CacheManagerConfigBuilder {
  constructor() {
    this.config = {
      projectPath: path.join(os.tmpdir(), `omny-test-${Date.now()}`),
      enableChangeDetection: false,
      cascadeInvalidation: false
    };
  }

  withProjectPath(projectPath) {
    this.config.projectPath = path.resolve(projectPath);
    return this;
  }

  withTempPath(suffix = '') {
    this.config.projectPath = path.join(
      os.tmpdir(),
      `omny-test-${suffix || Date.now()}`
    );
    return this;
  }

  withChangeDetection(enabled = true) {
    this.config.enableChangeDetection = enabled;
    return this;
  }

  withCascadeInvalidation(enabled = true) {
    this.config.cascadeInvalidation = enabled;
    return this;
  }

  asDefault() {
    this.config.enableChangeDetection = false;
    this.config.cascadeInvalidation = false;
    return this;
  }

  asProduction() {
    this.config.enableChangeDetection = true;
    this.config.cascadeInvalidation = true;
    return this;
  }

  build() {
    return { ...this.config };
  }

  static create() {
    return new CacheManagerConfigBuilder();
  }
}

/**
 * Builder para mock de UnifiedCacheManager
 * Útil para aislar tests que dependen del cache sin I/O real
 */
export class MockCacheManagerBuilder {
  constructor() {
    this._store = new Map();
    this._index = { entries: {}, metadata: { totalFiles: 0 } };
    this._projectPath = '/mock/project';
    this._initialized = true;
  }

  withProjectPath(projectPath) {
    this._projectPath = projectPath;
    return this;
  }

  withEntries(entries) {
    this._index.entries = { ...entries };
    return this;
  }

  withEntry(filePath, entry) {
    this._index.entries[filePath] = {
      hash: 'mock-hash',
      staticAnalyzed: false,
      llmAnalyzed: false,
      version: 1,
      timestamp: Date.now(),
      ...entry
    };
    return this;
  }

  withRamData(key, value) {
    this._store.set(key, value);
    return this;
  }

  build() {
    const store = this._store;
    const index = this._index;
    const projectPath = this._projectPath;

    return {
      projectPath,
      index,
      loaded: this._initialized,
      ramCache: store,

      // RAM cache methods
      set: (key, value) => { store.set(key, value); },
      get: (key) => store.get(key) ?? null,
      ramCacheSet: (key, value) => { store.set(key, value); },
      ramCacheGet: (key) => store.get(key) ?? null,

      // Async methods (stubs)
      initialize: async () => {},
      clear: async () => { store.clear(); index.entries = {}; },
      saveIndex: async () => {},
      registerFile: async (filePath, content) => ({
        changeType: 'NONE',
        needsStatic: false,
        needsLLM: false,
        isNew: false,
        entry: index.entries[filePath] || {}
      }),
      saveStaticAnalysis: async () => {},
      saveLLMInsights: async () => {},
      getStats: () => ({
        totalFiles: Object.keys(index.entries).length,
        staticAnalyzed: 0,
        llmAnalyzed: 0,
        byChangeType: {}
      }),
      cleanupDeletedFiles: async () => {},
      // Compat methods
      'get': (key) => store.get(key) ?? null,
      'set': (key, value) => { store.set(key, value); }
    };
  }

  static create() {
    return new MockCacheManagerBuilder();
  }
}

/**
 * Builder para CacheEntry (entrada individual en el índice)
 */
export class CacheEntryBuilder {
  constructor() {
    this.entry = {
      filePath: 'src/test.js',
      contentHash: 'abc123',
      metadataHash: null,
      combinedHash: 'abc123',
      staticAnalyzed: false,
      llmAnalyzed: false,
      version: 1,
      timestamp: Date.now(),
      changeType: 'NONE',
      dependsOn: [],
      usedBy: []
    };
  }

  withFilePath(filePath) {
    this.entry.filePath = filePath;
    return this;
  }

  withHash(hash) {
    this.entry.contentHash = hash;
    this.entry.combinedHash = hash;
    return this;
  }

  asStaticAnalyzed() {
    this.entry.staticAnalyzed = true;
    return this;
  }

  asLLMAnalyzed() {
    this.entry.staticAnalyzed = true;
    this.entry.llmAnalyzed = true;
    return this;
  }

  withVersion(version) {
    this.entry.version = version;
    return this;
  }

  withDependencies(deps) {
    this.entry.dependsOn = deps;
    return this;
  }

  build() {
    return { ...this.entry };
  }

  static create() {
    return new CacheEntryBuilder();
  }
}

export default {
  CacheManagerConfigBuilder,
  MockCacheManagerBuilder,
  CacheEntryBuilder
};

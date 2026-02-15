/**
 * @fileoverview Pipeline Test Factory
 * 
 * Factory for creating test data and scenarios for Pipeline CORE tests.
 * Provides builders for all major pipeline components.
 * 
 * @module tests/factories/pipeline-test.factory
 */

import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// PipelineBuilder - For building pipeline configurations
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// FileProcessingBuilder - For file processing scenarios
// ═══════════════════════════════════════════════════════════════════════════════

export class FileProcessingBuilder {
  constructor() {
    this.filePath = 'src/utils/helper.js';
    this.fileName = 'helper.js';
    this.content = '';
    this.parsedResult = null;
    this.imports = [];
    this.exports = [];
    this.definitions = [];
    this.metadata = {};
    this.atoms = [];
  }

  withFilePath(path) {
    this.filePath = path;
    this.fileName = path.split('/').pop();
    return this;
  }

  withContent(content) {
    this.content = content;
    return this;
  }

  withJavaScriptFunction(name, params = [], body = '// implementation') {
    this.content = `
      export function ${name}(${params.join(', ')}) {
        ${body}
      }
    `;
    this.definitions.push({
      type: 'function',
      name,
      params,
      exported: true
    });
    return this;
  }

  withClass(name, methods = []) {
    this.content = `
      export class ${name} {
        ${methods.map(m => `
          ${m.name}(${m.params?.join(', ') || ''}) {
            ${m.body || '// method body'}
          }
        `).join('\n')}
      }
    `;
    this.definitions.push({
      type: 'class',
      name,
      methods: methods.length
    });
    return this;
  }

  withImport(source, specifiers = [], type = 'local') {
    this.imports.push({
      source,
      specifiers,
      type
    });
    return this;
  }

  withExport(name, type = 'function') {
    this.exports.push({
      name,
      type
    });
    return this;
  }

  withParsedResult(overrides = {}) {
    this.parsedResult = {
      filePath: this.filePath,
      imports: this.imports,
      exports: this.exports,
      definitions: this.definitions,
      source: this.content,
      ...overrides
    };
    return this;
  }

  withAtom(atom = {}) {
    this.atoms.push({
      id: `atom-${this.atoms.length}`,
      name: `function${this.atoms.length}`,
      type: 'function',
      filePath: this.filePath,
      startLine: 1,
      endLine: 10,
      complexity: 1,
      linesOfCode: 10,
      isExported: true,
      ...atom
    });
    return this;
  }

  withMetadata(metadata = {}) {
    this.metadata = {
      jsdoc: { all: [] },
      async: { all: [] },
      errors: { all: [] },
      build: { envVars: [] },
      ...metadata
    };
    return this;
  }

  build() {
    return {
      filePath: this.filePath,
      fileName: this.fileName,
      ext: `.${this.fileName.split('.').pop()}`,
      content: this.content,
      parsed: this.parsedResult || {
        filePath: this.filePath,
        imports: this.imports,
        exports: this.exports,
        definitions: this.definitions,
        source: this.content
      },
      imports: this.imports,
      exports: this.exports,
      definitions: this.definitions,
      metadata: this.metadata,
      atoms: this.atoms,
      totalAtoms: this.atoms.length,
      atomsByType: this.atoms.reduce((acc, atom) => {
        acc[atom.type] = (acc[atom.type] || 0) + 1;
        return acc;
      }, {}),
      analyzedAt: new Date().toISOString()
    };
  }

  buildAnalysisResult(overrides = {}) {
    const base = this.build();
    return {
      filePath: base.filePath,
      fileName: base.fileName,
      ext: base.ext,
      imports: base.imports.map(imp => ({
        source: imp.source,
        resolvedPath: imp.source,
        type: imp.type,
        specifiers: imp.specifiers || []
      })),
      exports: base.exports,
      definitions: base.definitions,
      semanticConnections: [],
      metadata: base.metadata,
      atoms: base.atoms,
      totalAtoms: base.totalAtoms,
      atomsByType: base.atomsByType,
      analyzedAt: base.analyzedAt,
      ...overrides
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MolecularChainBuilder - For molecular chain scenarios
// ═══════════════════════════════════════════════════════════════════════════════

export class MolecularChainBuilder {
  constructor() {
    this.atoms = [];
    this.chains = [];
    this.connections = [];
    this.filePath = 'src/module.js';
    this.code = '';
  }

  withFilePath(path) {
    this.filePath = path;
    return this;
  }

  withCode(code) {
    this.code = code;
    return this;
  }

  addAtom(atom = {}) {
    const defaultAtom = {
      id: `atom-${this.atoms.length}`,
      name: `func${this.atoms.length}`,
      type: 'function',
      filePath: this.filePath,
      startLine: this.atoms.length * 10 + 1,
      endLine: this.atoms.length * 10 + 5,
      complexity: 1,
      linesOfCode: 5,
      isExported: false,
      calls: [],
      calledBy: [],
      semanticConnections: [],
      hasSideEffects: false,
      hasNetworkCalls: false,
      hasDomManipulation: false,
      hasStorageAccess: false,
      hasLogging: false,
      dna: null,
      temporal: {
        patterns: {
          initialization: [],
          lifecycleHooks: [],
          timers: [],
          asyncPatterns: {}
        }
      },
      ...atom
    };
    this.atoms.push(defaultAtom);
    return this;
  }

  addChain(chain = {}) {
    this.chains.push({
      id: `chain-${this.chains.length}`,
      name: chain.name || `chain${this.chains.length}`,
      steps: chain.steps || [],
      entryPoints: chain.entryPoints || [],
      exitPoints: chain.exitPoints || [],
      ...chain
    });
    return this;
  }

  addConnection(from, to, type = 'call') {
    this.connections.push({
      from,
      to,
      type,
      weight: 1,
      confidence: 1
    });
    return this;
  }

  buildMolecularStructure() {
    return {
      filePath: this.filePath,
      type: 'molecule',
      atomCount: this.atoms.length,
      atoms: this.atoms,
      molecularChains: this.chains.length > 0 ? {
        chains: this.chains,
        connections: this.connections
      } : null,
      extractedAt: new Date().toISOString()
    };
  }

  buildContext(overrides = {}) {
    return {
      filePath: this.filePath,
      code: this.code,
      fileInfo: {},
      fileMetadata: {},
      atoms: this.atoms,
      molecularChains: this.chains,
      connections: this.connections,
      ...overrides
    };
  }

  buildPipeline() {
    return {
      phases: [
        { name: 'AtomExtraction', canExecute: () => true },
        { name: 'ChainBuilding', canExecute: () => this.atoms.length > 0 }
      ],
      atoms: this.atoms,
      chains: this.chains
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EnhancerBuilder - For enhancer configurations
// ═══════════════════════════════════════════════════════════════════════════════

export class EnhancerBuilder {
  constructor() {
    this.atoms = [];
    this.files = {};
    this.systemMap = null;
    this.connections = {};
    this.riskScores = {};
    this.enhancedFiles = {};
    this.sideEffects = {};
    this.metadata = {};
  }

  withSystemMap(systemMap) {
    this.systemMap = systemMap;
    return this;
  }

  addAtom(atom = {}) {
    this.atoms.push({
      id: `atom-${this.atoms.length}`,
      name: `func${this.atoms.length}`,
      type: 'function',
      filePath: 'src/test.js',
      complexity: 1,
      linesOfCode: 10,
      isExported: false,
      calls: [],
      calledBy: [],
      semanticConnections: [],
      dna: null,
      metrics: {},
      temporal: { patterns: {} },
      ...atom
    });
    return this;
  }

  addFile(filePath, fileData = {}) {
    this.files[filePath] = {
      exports: [],
      imports: [],
      usedBy: [],
      dependsOn: [],
      functions: [],
      ...fileData
    };
    return this;
  }

  addEnhancedFile(filePath, data = {}) {
    this.enhancedFiles[filePath] = {
      semanticAnalysis: {
        sharedState: { sharedVariables: [] },
        eventPatterns: { eventListeners: [], eventEmitters: [] },
        sideEffects: [],
        sideEffectDetails: []
      },
      sideEffects: { sideEffects: [], details: [] },
      ...data
    };
    return this;
  }

  addConnection(type, connection) {
    if (!this.connections[type]) {
      this.connections[type] = [];
    }
    this.connections[type].push({
      sourceFile: 'src/a.js',
      targetFile: 'src/b.js',
      confidence: 1,
      ...connection
    });
    return this;
  }

  addRiskScore(filePath, score) {
    this.riskScores[filePath] = {
      totalScore: score,
      level: score > 70 ? 'critical' : score > 40 ? 'high' : score > 20 ? 'medium' : 'low',
      factors: []
    };
    return this;
  }

  buildMetadataContext() {
    return {
      atoms: this.atoms,
      filePath: 'src/test.js'
    };
  }

  buildConnectionContext() {
    return {
      atoms: this.atoms,
      connections: this.connections
    };
  }

  buildEnhancedSystemMap() {
    return {
      metadata: {
        enhanced: true,
        enhancedAt: new Date().toISOString(),
        analysisVersion: '3.5.0'
      },
      files: this.enhancedFiles,
      connections: {
        sharedState: this.connections.sharedState || [],
        eventListeners: this.connections.eventListeners || [],
        total: Object.values(this.connections).flat().length
      },
      riskAssessment: {
        scores: this.riskScores,
        report: { summary: { totalFiles: Object.keys(this.riskScores).length } }
      }
    };
  }

  buildProjectEnhancerInput() {
    return {
      allAtoms: this.atoms,
      projectMetadata: {
        totalFiles: Object.keys(this.files).length,
        totalAtoms: this.atoms.length
      }
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Factories
// ═══════════════════════════════════════════════════════════════════════════════

export function createMockFileSystem(files = {}) {
  const fileMap = new Map(Object.entries(files));
  
  return {
    readFile: vi.fn(async (path) => {
      if (fileMap.has(path)) {
        return fileMap.get(path);
      }
      throw new Error(`ENOENT: ${path}`);
    }),
    writeFile: vi.fn(async (path, content) => {
      fileMap.set(path, content);
    }),
    mkdir: vi.fn(async () => {}),
    access: vi.fn(async (path) => {
      if (!fileMap.has(path)) {
        throw new Error(`ENOENT: ${path}`);
      }
    }),
    stat: vi.fn(async (path) => ({
      isFile: () => fileMap.has(path),
      isDirectory: () => false,
      mtime: new Date()
    })),
    readdir: vi.fn(async () => []),
    _files: fileMap
  };
}

export function createMockLogger() {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn()
  };
}

export function createMockPhase(name = 'MockPhase', canExecute = true) {
  return {
    name,
    canExecute: vi.fn(() => canExecute),
    execute: vi.fn(async (context) => context),
    handleError: vi.fn((error, context) => context)
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

export function createValidParsedFile(overrides = {}) {
  return {
    filePath: 'src/test.js',
    imports: [],
    exports: [],
    definitions: [],
    source: '',
    ...overrides
  };
}

export function createValidSystemMap(overrides = {}) {
  return {
    metadata: {
      totalFiles: 0,
      totalFunctions: 0,
      totalDependencies: 0,
      totalFunctionLinks: 0,
      cyclesDetected: [],
      ...overrides.metadata
    },
    files: {},
    ...overrides
  };
}

export function createValidAtom(overrides = {}) {
  return {
    id: 'atom-1',
    name: 'testFunction',
    type: 'function',
    filePath: 'src/test.js',
    startLine: 1,
    endLine: 10,
    complexity: 1,
    linesOfCode: 10,
    isExported: false,
    calls: [],
    calledBy: [],
    ...overrides
  };
}

export function createValidConnection(overrides = {}) {
  return {
    sourceFile: 'src/a.js',
    targetFile: 'src/b.js',
    type: 'import',
    confidence: 1,
    ...overrides
  };
}

export default {
  PipelineBuilder,
  FileProcessingBuilder,
  MolecularChainBuilder,
  EnhancerBuilder,
  createMockFileSystem,
  createMockLogger,
  createMockPhase,
  createValidParsedFile,
  createValidSystemMap,
  createValidAtom,
  createValidConnection
};

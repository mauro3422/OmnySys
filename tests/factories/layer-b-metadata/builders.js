/**
 * @fileoverview Layer B Metadata Contract Factory
 * 
 * Builders para testing de metadata-contract
 * 
 * @module tests/factories/layer-b-metadata
 */

/**
 * Builder para metadatos de archivos
 */
export class MetadataBuilder {
  constructor(filePath = 'src/components/Test.js') {
    this.metadata = {
      filePath,
      exportCount: 2,
      exports: ['Component', 'helper'],
      dependentCount: 5,
      dependents: ['src/pages/Home.js', 'src/pages/About.js'],
      importCount: 3,
      imports: ['react', 'lodash', './utils'],
      functionCount: 4,
      functions: ['render', 'handleClick', 'useEffect', 'helper']
    };
  }

  withFilePath(path) {
    this.metadata.filePath = path;
    return this;
  }

  withExports(exports) {
    this.metadata.exports = Array.isArray(exports) ? exports : [exports];
    this.metadata.exportCount = this.metadata.exports.length;
    return this;
  }

  withDependents(dependents) {
    this.metadata.dependents = Array.isArray(dependents) ? dependents : [dependents];
    this.metadata.dependentCount = this.metadata.dependents.length;
    return this;
  }

  withImports(imports) {
    this.metadata.imports = Array.isArray(imports) ? imports : [imports];
    this.metadata.importCount = this.metadata.imports.length;
    return this;
  }

  withFunctions(functions) {
    this.metadata.functions = Array.isArray(functions) ? functions : [functions];
    this.metadata.functionCount = this.metadata.functions.length;
    return this;
  }

  asGodObject() {
    this.metadata.exportCount = 15;
    this.metadata.exports = Array(15).fill(0).map((_, i) => `export${i}`);
    this.metadata.dependentCount = 20;
    this.metadata.dependents = Array(20).fill(0).map((_, i) => `src/file${i}.js`);
    return this;
  }

  asOrphanModule() {
    this.metadata.exportCount = 5;
    this.metadata.exports = ['a', 'b', 'c', 'd', 'e'];
    this.metadata.dependentCount = 0;
    this.metadata.dependents = [];
    return this;
  }

  asFacade() {
    this.metadata.filePath = 'src/index.js';
    this.metadata.reExportCount = 5;
    this.metadata.functionCount = 1;
    this.metadata.exportCount = 5;
    return this;
  }

  asConfigHub() {
    this.metadata.exportCount = 8;
    this.metadata.dependentCount = 10;
    this.metadata.semanticDependentCount = 5;
    this.metadata.functionCount = 1;
    return this;
  }

  asEntryPoint() {
    this.metadata.importCount = 10;
    this.metadata.imports = Array(10).fill(0).map((_, i) => `import${i}`);
    this.metadata.dependentCount = 0;
    this.metadata.exports = [];
    this.metadata.exportCount = 0;
    return this;
  }

  withLocalStorageKeys(keys) {
    this.metadata.localStorageKeys = Array.isArray(keys) ? keys : [keys];
    return this;
  }

  withEventNames(events) {
    this.metadata.eventNames = Array.isArray(events) ? events : [events];
    return this;
  }

  withInvalidType(field, value) {
    this.metadata[field] = value;
    return this;
  }

  withoutField(field) {
    delete this.metadata[field];
    return this;
  }

  build() {
    return { ...this.metadata };
  }

  static create(filePath) {
    return new MetadataBuilder(filePath);
  }
}

/**
 * Builder para resultados enriquecidos (enriched results)
 */
export class EnrichedResultsBuilder {
  constructor() {
    this.results = {
      files: {}
    };
  }

  addFile(filePath, options = {}) {
    const fileData = {
      imports: options.imports || [],
      usedBy: options.usedBy || [],
      semanticAnalysis: {
        sharedState: {
          writes: options.sharedStateWrites || [],
          reads: options.sharedStateReads || []
        },
        eventPatterns: {
          eventEmitters: options.eventEmitters || [],
          eventListeners: options.eventListeners || []
        },
        sideEffects: {
          hasGlobalAccess: options.hasGlobalAccess || false,
          usesLocalStorage: options.usesLocalStorage || false,
          modifiesDOM: options.modifiesDOM || false
        }
      },
      semanticConnections: options.semanticConnections || [],
      llmInsights: {
        confidence: options.confidence || 0.9
      }
    };
    
    this.results.files[filePath] = fileData;
    return this;
  }

  withOrphanedFile(filePath) {
    return this.addFile(filePath, {
      usedBy: [],
      imports: [],
      hasGlobalAccess: true
    });
  }

  withEventEmitter(filePath, events) {
    return this.addFile(filePath, {
      eventEmitters: events
    });
  }

  withEventListener(filePath, events) {
    return this.addFile(filePath, {
      eventListeners: events
    });
  }

  withSharedStateWrite(filePath, keys) {
    return this.addFile(filePath, {
      sharedStateWrites: keys
    });
  }

  withSharedStateRead(filePath, keys) {
    return this.addFile(filePath, {
      sharedStateReads: keys
    });
  }

  withHighConnections(filePath, connectionCount = 15) {
    const connections = Array(connectionCount).fill(0).map((_, i) => ({
      id: `conn${i}`,
      target: `target${i}.js`,
      confidence: 0.8
    }));
    return this.addFile(filePath, {
      semanticConnections: connections
    });
  }

  build() {
    return { ...this.results };
  }

  static create() {
    return new EnrichedResultsBuilder();
  }
}

/**
 * Builder para file analysis
 */
export class FileAnalysisBuilder {
  constructor(filePath = 'src/components/Test.js') {
    this.analysis = {
      filePath,
      exports: [{ name: 'Component' }, { name: 'helper' }],
      usedBy: ['src/pages/Home.js'],
      imports: [{ source: 'react' }],
      functions: [{ name: 'render' }, { name: 'handleClick' }],
      semanticAnalysis: {
        sharedState: { writes: [], reads: [] },
        eventPatterns: { eventEmitters: [], eventListeners: [] },
        sideEffects: { hasGlobalAccess: false }
      }
    };
  }

  withSemanticAnalysis(analysis) {
    this.analysis.semanticAnalysis = { ...this.analysis.semanticAnalysis, ...analysis };
    return this;
  }

  withExports(exports) {
    this.analysis.exports = exports.map(name => ({ name }));
    return this;
  }

  build() {
    return { ...this.analysis };
  }

  static create(filePath) {
    return new FileAnalysisBuilder(filePath);
  }
}

/**
 * Exportación default
 */
export default {
  MetadataBuilder,
  EnrichedResultsBuilder,
  FileAnalysisBuilder
};

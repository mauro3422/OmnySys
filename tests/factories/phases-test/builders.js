/**
 * @fileoverview Phases Test Factory - Builders
 */

export class PhaseContextBuilder {
  constructor() {
    this.context = {
      filePath: 'test.js',
      code: '',
      fileInfo: { functions: [] },
      fileMetadata: {},
      atoms: [],
      atomCount: 0,
      molecularChains: null
    };
  }

  /**
   * Set file path
   * @param {string} filePath - File path
   * @returns {PhaseContextBuilder}
   */
  withFilePath(filePath) {
    this.context.filePath = filePath;
    return this;
  }

  /**
   * Set source code
   * @param {string} code - Source code
   * @returns {PhaseContextBuilder}
   */
  withCode(code) {
    this.context.code = code;
    return this;
  }

  /**
   * Set file info with functions
   * @param {Object} fileInfo - Parsed file info
   * @returns {PhaseContextBuilder}
   */
  withFileInfo(fileInfo) {
    this.context.fileInfo = fileInfo;
    return this;
  }

  /**
   * Set file metadata
   * @param {Object} fileMetadata - File-level metadata
   * @returns {PhaseContextBuilder}
   */
  withFileMetadata(fileMetadata) {
    this.context.fileMetadata = fileMetadata;
    return this;
  }

  /**
   * Add a function to file info
   * @param {Object} func - Function info
   * @returns {PhaseContextBuilder}
   */
  withFunction(func) {
    this.context.fileInfo.functions = this.context.fileInfo.functions || [];
    this.context.fileInfo.functions.push(func);
    return this;
  }

  /**
   * Set atoms in context
   * @param {Array} atoms - Array of atom metadata
   * @returns {PhaseContextBuilder}
   */
  withAtoms(atoms) {
    this.context.atoms = atoms;
    this.context.atomCount = atoms.length;
    return this;
  }

  /**
   * Set molecular chains
   * @param {Object} chains - Molecular chain data
   * @returns {PhaseContextBuilder}
   */
  withMolecularChains(chains) {
    this.context.molecularChains = chains;
    return this;
  }

  /**
   * Build the context
   * @returns {Object} Phase execution context
   */
  build() {
    return { ...this.context };
  }

  static create() {
    return new PhaseContextBuilder();
  }
}

/**
 * Builder for creating atom metadata
 */
export class AtomBuilder {
  constructor(name = 'testFunction') {
    this.atom = {
      id: `test::${name}`,
      name,
      type: 'atom',
      filePath: 'test.js',
      line: 1,
      endLine: 10,
      linesOfCode: 10,
      isExported: false,
      className: null,
      functionType: 'declaration',
      complexity: 1,
      hasSideEffects: false,
      hasNetworkCalls: false,
      hasDomManipulation: false,
      hasStorageAccess: false,
      hasLogging: false,
      networkEndpoints: [],
      calls: [],
      internalCalls: [],
      externalCalls: [],
      externalCallCount: 0,
      hasErrorHandling: false,
      isAsync: false,
      hasLifecycleHooks: false,
      lifecycleHooks: [],
      hasCleanupPatterns: false,
      temporal: { patterns: [], executionOrder: null },
      typeContracts: {},
      errorFlow: {},
      hasNestedLoops: false,
      hasBlockingOps: false,
      performance: {},
      dataFlow: null,
      dataFlowAnalysis: null,
      hasDataFlow: false,
      dna: null,
      lineage: null,
      archetype: { type: 'standard', severity: 1, confidence: 1.0 },
      extractedAt: new Date().toISOString(),
      _meta: {
        dataFlowVersion: '1.0.0-fractal',
        extractionTime: new Date().toISOString(),
        confidence: 0.5
      }
    };
  }

  /**
   * Set atom ID
   * @param {string} id - Atom ID
   * @returns {AtomBuilder}
   */
  withId(id) {
    this.atom.id = id;
    return this;
  }

  /**
   * Set atom name
   * @param {string} name - Function name
   * @returns {AtomBuilder}
   */
  withName(name) {
    this.atom.name = name;
    this.atom.id = `test::${name}`;
    return this;
  }

  /**
   * Set file path
   * @param {string} filePath - File path
   * @returns {AtomBuilder}
   */
  withFilePath(filePath) {
    this.atom.filePath = filePath;
    return this;
  }

  /**
   * Set line numbers
   * @param {number} line - Start line
   * @param {number} endLine - End line
   * @returns {AtomBuilder}
   */
  atLines(line, endLine) {
    this.atom.line = line;
    this.atom.endLine = endLine;
    this.atom.linesOfCode = endLine - line + 1;
    return this;
  }

  /**
   * Mark as exported
   * @param {boolean} exported - Is exported
   * @returns {AtomBuilder}
   */
  isExported(exported = true) {
    this.atom.isExported = exported;
    return this;
  }

  /**
   * Set class membership
   * @param {string} className - Class name
   * @returns {AtomBuilder}
   */
  inClass(className) {
    this.atom.className = className;
    return this;
  }

  /**
   * Set function type
   * @param {string} type - Function type
   * @returns {AtomBuilder}
   */
  ofType(type) {
    this.atom.functionType = type;
    return this;
  }

  /**
   * Set complexity
   * @param {number} complexity - Complexity score
   * @returns {AtomBuilder}
   */
  withComplexity(complexity) {
    this.atom.complexity = complexity;
    return this;
  }

  /**
   * Set side effects
   * @param {Object} sideEffects - Side effects object
   * @returns {AtomBuilder}
   */
  withSideEffects(sideEffects) {
    this.atom.hasSideEffects = sideEffects.all?.length > 0;
    this.atom.hasNetworkCalls = sideEffects.networkCalls?.length > 0;
    this.atom.hasDomManipulation = sideEffects.domManipulations?.length > 0;
    this.atom.hasStorageAccess = sideEffects.storageAccess?.length > 0;
    this.atom.hasLogging = sideEffects.consoleUsage?.length > 0;
    this.atom.networkEndpoints = sideEffects.networkCalls?.map(c => c.url || c.endpoint).filter(Boolean) || [];
    return this;
  }

  /**
   * Set calls
   * @param {Array} calls - Function calls
   * @returns {AtomBuilder}
   */
  withCalls(calls) {
    this.atom.calls = calls;
    return this;
  }

  /**
   * Set internal calls
   * @param {Array} calls - Internal calls
   * @returns {AtomBuilder}
   */
  withInternalCalls(calls) {
    this.atom.internalCalls = calls;
    return this;
  }

  /**
   * Set external calls
   * @param {Array} calls - External calls
   * @returns {AtomBuilder}
   */
  withExternalCalls(calls) {
    this.atom.externalCalls = calls;
    this.atom.externalCallCount = calls.length;
    return this;
  }

  /**
   * Mark as having error handling
   * @param {boolean} hasHandling - Has error handling
   * @returns {AtomBuilder}
   */
  hasErrorHandling(hasHandling = true) {
    this.atom.hasErrorHandling = hasHandling;
    return this;
  }

  /**
   * Mark as async
   * @param {boolean} async - Is async
   * @returns {AtomBuilder}
   */
  isAsync(async = true) {
    this.atom.isAsync = async;
    return this;
  }

  /**
   * Set temporal patterns
   * @param {Array} patterns - Temporal patterns
   * @returns {AtomBuilder}
   */
  withTemporalPatterns(patterns) {
    this.atom.temporal.patterns = patterns;
    this.atom.hasLifecycleHooks = patterns.some(p => p.type === 'lifecycle');
    this.atom.hasCleanupPatterns = patterns.some(p => p.type === 'cleanup');
    return this;
  }

  /**
   * Set type contracts
   * @param {Object} contracts - Type contracts
   * @returns {AtomBuilder}
   */
  withTypeContracts(contracts) {
    this.atom.typeContracts = contracts;
    return this;
  }

  /**
   * Set error flow
   * @param {Object} errorFlow - Error flow info
   * @returns {AtomBuilder}
   */
  withErrorFlow(errorFlow) {
    this.atom.errorFlow = errorFlow;
    return this;
  }

  /**
   * Set performance metrics
   * @param {Object} metrics - Performance metrics
   * @returns {AtomBuilder}
   */
  withPerformance(metrics) {
    this.atom.performance = metrics;
    this.atom.hasNestedLoops = metrics.hasNestedLoops || false;
    this.atom.hasBlockingOps = metrics.hasBlockingOps || false;
    return this;
  }

  /**
   * Set data flow
   * @param {Object} dataFlow - Data flow info
   * @returns {AtomBuilder}
   */
  withDataFlow(dataFlow) {
    this.atom.dataFlow = dataFlow.real || dataFlow;
    this.atom.dataFlowAnalysis = dataFlow.analysis || null;
    this.atom.hasDataFlow = dataFlow !== null && (dataFlow.inputs?.length > 0 || dataFlow.real?.inputs?.length > 0);
    return this;
  }

  /**
   * Set DNA
   * @param {Object} dna - DNA metadata
   * @returns {AtomBuilder}
   */
  withDNA(dna) {
    this.atom.dna = dna;
    return this;
  }

  /**
   * Set archetype
   * @param {Object} archetype - Archetype info
   * @returns {AtomBuilder}
   */
  withArchetype(archetype) {
    this.atom.archetype = archetype;
    return this;
  }

  /**
   * Set calledBy relationships
   * @param {Array} calledBy - Array of caller IDs
   * @returns {AtomBuilder}
   */
  calledBy(calledBy) {
    this.atom.calledBy = calledBy;
    return this;
  }

  /**
   * Build the atom
   * @returns {Object} Atom metadata
   */
  build() {
    return { ...this.atom };
  }

  static create(name = 'testFunction') {
    return new AtomBuilder(name);
  }
}

/**
 * Builder for creating function info from parser
 */
export class FunctionInfoBuilder {
  constructor(name = 'testFunction') {
    this.func = {
      id: `test::${name}`,
      name,
      line: 1,
      endLine: 10,
      type: 'declaration',
      isExported: false,
      isAsync: false,
      className: null,
      calls: [],
      node: null,
      ast: null
    };
  }

  /**
   * Set function name
   * @param {string} name - Function name
   * @returns {FunctionInfoBuilder}
   */
  withName(name) {
    this.func.name = name;
    this.func.id = `test::${name}`;
    return this;
  }

  /**
   * Set line numbers
   * @param {number} line - Start line
   * @param {number} endLine - End line
   * @returns {FunctionInfoBuilder}
   */
  atLines(line, endLine) {
    this.func.line = line;
    this.func.endLine = endLine;
    return this;
  }

  /**
   * Set function type
   * @param {string} type - Function type
   * @returns {FunctionInfoBuilder}
   */
  ofType(type) {
    this.func.type = type;
    return this;
  }

  /**
   * Mark as exported
   * @param {boolean} exported - Is exported
   * @returns {FunctionInfoBuilder}
   */
  isExported(exported = true) {
    this.func.isExported = exported;
    return this;
  }

  /**
   * Mark as async
   * @param {boolean} async - Is async
   * @returns {FunctionInfoBuilder}
   */
  isAsync(async = true) {
    this.func.isAsync = async;
    return this;
  }

  /**
   * Set class name
   * @param {string} className - Class name
   * @returns {FunctionInfoBuilder}
   */
  inClass(className) {
    this.func.className = className;
    return this;
  }

  /**
   * Set calls
   * @param {Array} calls - Function calls
   * @returns {FunctionInfoBuilder}
   */
  withCalls(calls) {
    this.func.calls = calls;
    return this;
  }

  /**
   * Set AST node
   * @param {Object} node - AST node
   * @returns {FunctionInfoBuilder}
   */
  withNode(node) {
    this.func.node = node;
    return this;
  }

  /**
   * Build the function info
   * @returns {Object} Function info
   */
  build() {
    return { ...this.func };
  }

  static create(name = 'testFunction') {
    return new FunctionInfoBuilder(name);
  }
}

/**
 * Builder for creating file metadata
 */
export class FileMetadataBuilder {
  constructor() {
    this.metadata = {
      jsdoc: [],
      imports: [],
      exports: [],
      type: 'module'
    };
  }

  /**
   * Add JSDoc comment
   * @param {Object} jsdoc - JSDoc info
   * @returns {FileMetadataBuilder}
   */
  withJSDoc(jsdoc) {
    this.metadata.jsdoc.push(jsdoc);
    return this;
  }

  /**
   * Add import
   * @param {Object} imp - Import info
   * @returns {FileMetadataBuilder}
   */
  withImport(imp) {
    this.metadata.imports.push(imp);
    return this;
  }

  /**
   * Add export
   * @param {Object} exp - Export info
   * @returns {FileMetadataBuilder}
   */
  withExport(exp) {
    this.metadata.exports.push(exp);
    return this;
  }

  /**
   * Set module type
   * @param {string} type - Module type
   * @returns {FileMetadataBuilder}
   */
  ofType(type) {
    this.metadata.type = type;
    return this;
  }

  /**
   * Build the file metadata
   * @returns {Object} File metadata
   */
  build() {
    return { ...this.metadata };
  }

  static create() {
    return new FileMetadataBuilder();
  }
}

/**
 * Predefined atom scenarios for testing
 */
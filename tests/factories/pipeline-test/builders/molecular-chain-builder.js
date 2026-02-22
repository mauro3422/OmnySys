/**
 * @fileoverview Molecular Chain Builder - For molecular chain scenarios
 */

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

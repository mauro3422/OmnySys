/**
 * @fileoverview Race Strategy Builder
 * Builder for creating race detection strategies test scenarios
 */

export class RaceStrategyBuilder {
  constructor() {
    this.project = null;
    this.sharedState = new Map();
    this.options = {};
  }

  static create() {
    return new RaceStrategyBuilder();
  }

  withProject(project) {
    this.project = project;
    return this;
  }

  withSharedState(stateKey, accesses) {
    this.sharedState.set(stateKey, accesses);
    return this;
  }

  withAccess(stateKey, access) {
    if (!this.sharedState.has(stateKey)) {
      this.sharedState.set(stateKey, []);
    }
    this.sharedState.get(stateKey).push(access);
    return this;
  }

  withOptions(options) {
    this.options = { ...this.options, ...options };
    return this;
  }

  createAccess(atomId, type, options = {}) {
    return {
      atom: atomId,
      atomName: options.atomName || atomId,
      type,
      isAsync: options.isAsync ?? true,
      isExported: options.isExported ?? false,
      file: options.file || 'test.js',
      line: options.line || 1,
      code: options.code || '',
      ...options
    };
  }

  createMockProject(atoms = [], options = {}) {
    return {
      modules: [{
        moduleName: 'test',
        modulePath: 'test.js',
        files: [{
          filePath: 'test.js',
          atoms: atoms.map((atom, idx) => ({
            id: atom.id || `atom-${idx}`,
            name: atom.name || `func${idx}`,
            isAsync: atom.isAsync ?? true,
            code: atom.code || '',
            calls: atom.calls || [],
            ...atom
          }))
        }]
      }],
      system: {
        businessFlows: options.businessFlows || [],
        entryPoints: options.entryPoints || []
      }
    };
  }

  build() {
    return {
      project: this.project || this.createMockProject(),
      sharedState: this.sharedState,
      options: this.options
    };
  }
}

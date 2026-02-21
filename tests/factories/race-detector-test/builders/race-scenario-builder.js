/**
 * @fileoverview Race Scenario Builder
 * Builder for creating race condition test scenarios
 */

export class RaceScenarioBuilder {
  constructor() {
    this.atoms = [];
    this.sharedState = [];
    this.connections = [];
    this.modules = [];
    this.molecules = [];
  }

  static create() {
    return new RaceScenarioBuilder();
  }

  withAtom(id, name, options = {}) {
    this.atoms.push({
      id,
      name,
      filePath: options.filePath || 'test.js',
      line: options.line || 1,
      isAsync: options.isAsync || false,
      isExported: options.isExported || false,
      calls: options.calls || [],
      accesses: options.accesses || [],
      dataFlow: options.dataFlow || { sideEffects: [] },
      code: options.code || '',
      ...options
    });
    return this;
  }

  withSharedState(variableName, options = {}) {
    this.sharedState.push({
      name: variableName,
      type: options.type || 'variable',
      locations: options.locations || [],
      reads: options.reads || [],
      writes: options.writes || [],
      ...options
    });
    return this;
  }

  withReadAccess(atomId, variable, line = 1) {
    const atom = this.atoms.find(a => a.id === atomId);
    if (atom) {
      atom.accesses = atom.accesses || [];
      atom.accesses.push({
        type: 'read',
        variable,
        line
      });
    }
    return this;
  }

  withWriteAccess(atomId, variable, line = 1) {
    const atom = this.atoms.find(a => a.id === atomId);
    if (atom) {
      atom.accesses = atom.accesses || [];
      atom.accesses.push({
        type: 'write',
        variable,
        line
      });
    }
    return this;
  }

  withConnection(source, target, type = 'call') {
    this.connections.push({
      source,
      target,
      type
    });
    return this;
  }

  withModule(name, options = {}) {
    this.modules.push({
      moduleName: name,
      modulePath: options.path || `src/${name}.js`,
      files: options.files || [],
      ...options
    });
    return this;
  }

  withMolecule(filePath, options = {}) {
    this.molecules.push({
      filePath,
      atoms: options.atoms || [],
      ...options
    });
    return this;
  }

  build() {
    return {
      atoms: this.atoms,
      sharedState: this.sharedState,
      connections: this.connections,
      modules: this.modules,
      molecules: this.molecules,
      getProjectData: () => ({
        atoms: this.atoms,
        connections: this.connections,
        sharedState: this.sharedState,
        modules: this.modules.length > 0 ? this.modules : [{
          moduleName: 'test',
          modulePath: 'test.js',
          files: this.molecules.length > 0 ? this.molecules : [{ filePath: 'test.js', atoms: this.atoms }]
        }],
        system: {
          businessFlows: [],
          entryPoints: []
        }
      })
    };
  }
}

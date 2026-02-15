/**
 * @fileoverview Race Detector Test Factory - Builders
 */

export class RaceScenarioBuilder {
  constructor() {
    this.atoms = [];
    this.sharedState = [];
    this.connections = [];
    this.modules = [];
    this.molecules = [];
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

/**
 * Factory for creating common race condition patterns
 */
export class RacePatternFactory {
  static readWriteRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'reader', { isAsync: true })
      .withAtom('atom-2', 'writer', { isAsync: true })
      .withSharedState('counter', {
        locations: [
          { atomId: 'atom-1', type: 'read' },
          { atomId: 'atom-2', type: 'write' }
        ]
      })
      .withReadAccess('atom-1', 'counter', 10)
      .withWriteAccess('atom-2', 'counter', 20)
      .build();
  }

  static writeWriteRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'writer1', { isAsync: true })
      .withAtom('atom-2', 'writer2', { isAsync: true })
      .withSharedState('sharedArray')
      .withWriteAccess('atom-1', 'sharedArray', 15)
      .withWriteAccess('atom-2', 'sharedArray', 25)
      .build();
  }

  static singletonRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'getInstance1', { isAsync: true })
      .withAtom('atom-2', 'getInstance2', { isAsync: true })
      .withSharedState('singletonInstance')
      .withWriteAccess('atom-1', 'singletonInstance', 5)
      .withWriteAccess('atom-2', 'singletonInstance', 8)
      .build();
  }

  static counterRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'increment', { isAsync: true })
      .withAtom('atom-2', 'decrement', { isAsync: true })
      .withSharedState('count', { type: 'counter' })
      .withReadAccess('atom-1', 'count', 10)
      .withWriteAccess('atom-1', 'count', 11)
      .withReadAccess('atom-2', 'count', 20)
      .withWriteAccess('atom-2', 'count', 21)
      .build();
  }

  static lazyInitializationRace() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'initLazy1', { isAsync: true })
      .withAtom('atom-2', 'initLazy2', { isAsync: true })
      .withSharedState('lazyValue')
      .withReadAccess('atom-1', 'lazyValue', 5)
      .withWriteAccess('atom-1', 'lazyValue', 8)
      .withReadAccess('atom-2', 'lazyValue', 12)
      .withWriteAccess('atom-2', 'lazyValue', 15)
      .build();
  }

  static noRaceSafeAccess() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'safeReader', { isAsync: false })
      .withAtom('atom-2', 'safeWriter', { isAsync: false })
      .withSharedState('safeVar')
      .withReadAccess('atom-1', 'safeVar', 10)
      .withWriteAccess('atom-2', 'safeVar', 20)
      .build();
  }

  static atomicOperation() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'atomicIncrement', { 
        isAsync: true,
        code: 'Atomics.add(counter, 0, 1)'
      })
      .withAtom('atom-2', 'atomicDecrement', { 
        isAsync: true,
        code: 'Atomics.sub(counter, 0, 1)'
      })
      .withSharedState('atomicCounter', { isAtomic: true })
      .build();
  }

  static lockedAccess() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'lockedWriter1', { 
        isAsync: true,
        code: 'await mutex.lock(); sharedVar = 1; mutex.unlock();'
      })
      .withAtom('atom-2', 'lockedWriter2', { 
        isAsync: true,
        code: 'await mutex.lock(); sharedVar = 2; mutex.unlock();'
      })
      .withSharedState('lockedVar')
      .withWriteAccess('atom-1', 'lockedVar', 15)
      .withWriteAccess('atom-2', 'lockedVar', 25)
      .build();
  }

  static globalVariableAccess() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'globalWriter1', {
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'write', variable: 'window.globalVar', target: 'window.globalVar' }
          ]
        }
      })
      .withAtom('atom-2', 'globalWriter2', {
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'write', variable: 'window.globalVar', target: 'window.globalVar' }
          ]
        }
      })
      .withSharedState('window.globalVar')
      .build();
  }

  static moduleStateAccess() {
    return new RaceScenarioBuilder()
      .withAtom('atom-1', 'moduleWriter1', {
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'module_state_write', target: 'module.sharedState' }
          ]
        }
      })
      .withAtom('atom-2', 'moduleWriter2', {
        isAsync: true,
        dataFlow: {
          sideEffects: [
            { type: 'module_state_write', target: 'module.sharedState' }
          ]
        }
      })
      .withSharedState('module.sharedState')
      .build();
  }
}

/**
 * Validation helpers for race detector results
 */
export class RaceDetectorValidator {
  static isValidRace(race) {
    return race && 
           typeof race === 'object' &&
           'id' in race &&
           'type' in race &&
           'severity' in race &&
           'accesses' in race &&
           Array.isArray(race.accesses) &&
           race.accesses.length >= 2;
  }

  static isValidAccess(access) {
    return access &&
           typeof access === 'object' &&
           'atom' in access &&
           'type' in access;
  }

  static isValidMitigation(mitigation) {
    return mitigation &&
           typeof mitigation === 'object' &&
           'type' in mitigation;
  }

  static hasReadWritePattern(race) {
    if (!race.accesses || race.accesses.length < 2) return false;
    const types = race.accesses.map(a => a.type);
    return types.includes('read') && types.includes('write');
  }

  static hasWriteWritePattern(race) {
    if (!race.accesses || race.accesses.length < 2) return false;
    return race.accesses.every(a => a.type === 'write');
  }

  static getRaceSeverityRank(severity) {
    const ranks = { low: 1, medium: 2, high: 3, critical: 4 };
    return ranks[severity] || 0;
  }
}

/**
 * Builder for creating project data structures
 */
export class ProjectDataBuilder {
  constructor() {
    this.modules = [];
    this.system = {
      businessFlows: [],
      entryPoints: []
    };
  }

  withModule(name, options = {}) {
    const module = {
      moduleName: name,
      modulePath: options.path || `src/${name}.js`,
      files: []
    };
    this.modules.push(module);
    return this;
  }

  withMolecule(moduleName, filePath, atoms = []) {
    const module = this.modules.find(m => m.moduleName === moduleName);
    if (module) {
      module.files.push({
        filePath,
        atoms: atoms.map((atom, idx) => ({
          id: `${filePath}::${atom.name || `atom${idx}`}`,
          name: atom.name || `atom${idx}`,
          isAsync: atom.isAsync || false,
          isExported: atom.isExported || false,
          code: atom.code || '',
          dataFlow: atom.dataFlow || { sideEffects: [] },
          line: atom.line || 1,
          ...atom
        }))
      });
    }
    return this;
  }

  withBusinessFlow(name, steps = []) {
    this.system.businessFlows.push({
      name,
      steps: steps.map(step => ({
        function: step.function,
        module: step.module
      }))
    });
    return this;
  }

  withEntryPoint(type, module, handler = {}) {
    this.system.entryPoints.push({
      type,
      module,
      handler
    });
    return this;
  }

  build() {
    return {
      modules: this.modules,
      system: this.system
    };
  }
}

/**
 * Builder for creating race condition objects
 */
export class RaceConditionBuilder {
  constructor() {
    this.id = 'race-1';
    this.type = 'RW';
    this.stateKey = 'sharedVar';
    this.stateType = 'global';
    this.severity = 'high';
    this.accesses = [];
  }

  withId(id) {
    this.id = id;
    return this;
  }

  withType(type) {
    this.type = type;
    return this;
  }

  withStateKey(key) {
    this.stateKey = key;
    return this;
  }

  withStateType(type) {
    this.stateType = type;
    return this;
  }

  withSeverity(severity) {
    this.severity = severity;
    return this;
  }

  withAccess(atomId, options = {}) {
    this.accesses.push({
      atom: atomId,
      atomName: options.name || 'unknown',
      type: options.type || 'read',
      isAsync: options.isAsync || false,
      isExported: options.isExported || false,
      module: options.module || 'test',
      file: options.file || 'test.js',
      line: options.line || 1,
      ...options
    });
    return this;
  }

  build() {
    return {
      id: this.id,
      type: this.type,
      stateKey: this.stateKey,
      stateType: this.stateType,
      severity: this.severity,
      accesses: this.accesses,
      description: `Race condition on ${this.stateKey}`
    };
  }
}

/**
 * Builder for creating race detection strategies test scenarios
 */
export class RaceStrategyBuilder {
  constructor() {
    this.project = null;
    this.sharedState = new Map();
    this.options = {};
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

/**
 * Builder for creating mitigation test scenarios
 */
export class MitigationBuilder {
  constructor() {
    this.access1 = null;
    this.access2 = null;
    this.project = null;
    this.atoms = [];
  }

  withAccessPair(access1, access2) {
    this.access1 = access1;
    this.access2 = access2;
    return this;
  }

  withProject(project) {
    this.project = project;
    return this;
  }

  withAtom(atom) {
    this.atoms.push(atom);
    return this;
  }

  createAccess(atomId, options = {}) {
    return {
      atom: atomId,
      file: options.file || 'test.js',
      line: options.line || 1,
      type: options.type || 'write',
      ...options
    };
  }

  createAtom(id, code, options = {}) {
    return {
      id,
      name: options.name || id,
      code,
      isAsync: options.isAsync ?? true,
      locks: options.locks || null,
      ...options
    };
  }

  createMockProject() {
    return {
      modules: [{
        moduleName: 'test',
        files: [{
          filePath: 'test.js',
          atoms: this.atoms
        }]
      }]
    };
  }

  build() {
    const project = this.project || this.createMockProject();
    return {
      access1: this.access1,
      access2: this.access2,
      project,
      atoms: this.atoms
    };
  }
}

/**
 * Test data constants for race detection
 */


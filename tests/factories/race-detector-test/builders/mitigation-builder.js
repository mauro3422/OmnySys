/**
 * @fileoverview Mitigation Builder
 * Builder for creating mitigation test scenarios
 */

export class MitigationBuilder {
  constructor() {
    this.access1 = null;
    this.access2 = null;
    this.project = null;
    this.atoms = [];
  }

  static create() {
    return new MitigationBuilder();
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

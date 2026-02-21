/**
 * @fileoverview Project Data Builder
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

  static create() {
    return new ProjectDataBuilder();
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

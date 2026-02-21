/**
 * @fileoverview Project Builder
 * 
 * Builder for project test scenarios.
 * 
 * @module tests/factories/module-system-test/builders/project-builder
 */

import { ModuleBuilder } from './module-builder.js';

export class ProjectBuilder {
  constructor(root = '/project') {
    this.root = root;
    this.modules = [];
  }

  static create(root = '/project') {
    return new ProjectBuilder(root);
  }

  withModule(moduleBuilder) {
    this.modules.push(moduleBuilder.build());
    return this;
  }

  withModules(count, prefix = 'module') {
    for (let i = 1; i <= count; i++) {
      this.modules.push(ModuleBuilder.create(`${prefix}-${i}`).build());
    }
    return this;
  }

  withSimpleModule(name, options = {}) {
    const builder = ModuleBuilder.create(name)
      .withFile(`src/${name}/index.js`, { exports: [options.mainExport || 'main'] })
      .withExport(options.mainExport || 'main', { file: 'index.js', type: options.exportType || 'function' });
    
    if (options.withRoute) {
      builder.withFile(`src/${name}/routes.js`);
    }
    if (options.withService) {
      builder.withFile(`src/${name}/service.js`);
    }
    
    this.modules.push(builder.build());
    return this;
  }

  withApiModule(name, routes = []) {
    const builder = ModuleBuilder.create(name)
      .withFile(`src/${name}/routes.js`, { hasSideEffects: true });
    
    routes.forEach(route => {
      builder.withMolecule(`src/${name}/routes.js`, [{
        name: route.handler,
        isExported: true,
        isAsync: route.async || false,
        calls: route.calls || []
      }]);
    });
    
    this.modules.push(builder.build());
    return this;
  }

  withLayeredModules(names) {
    const layers = ['controllers', 'services', 'repositories', 'models'];
    layers.forEach(layer => {
      if (names.includes(layer)) {
        this.modules.push(ModuleBuilder.create(layer)
          .withFile(`src/${layer}/index.js`)
          .build());
      }
    });
    return this;
  }

  withConnectedModules(connections) {
    connections.forEach(([from, to, functions]) => {
      let fromModule = this.modules.find(m => m.moduleName === from);
      if (!fromModule) {
        fromModule = ModuleBuilder.create(from).build();
        this.modules.push(fromModule);
      }
      fromModule.imports.push({
        module: to,
        functions: Array.isArray(functions) ? functions : [functions],
        count: Array.isArray(functions) ? functions.length : 1
      });
    });
    return this;
  }

  build() {
    return {
      root: this.root,
      modules: this.modules
    };
  }
}

export default ProjectBuilder;

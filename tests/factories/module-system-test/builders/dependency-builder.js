/**
 * @fileoverview Dependency Builder
 * 
 * Builder for dependency test scenarios.
 * 
 * @module tests/factories/module-system-test/builders/dependency-builder
 */

export class DependencyBuilder {
  constructor() {
    this.dependencies = [];
  }

  static create() {
    return new DependencyBuilder();
  }

  add(from, to, options = {}) {
    this.dependencies.push({
      from,
      to,
      type: options.type || 'dependency',
      strength: options.strength || 'weak',
      dataFlow: options.dataFlow || { imports: [], count: 1 },
      ...options
    });
    return this;
  }

  strong(from, to, dataFlow = {}) {
    return this.add(from, to, { strength: 'strong', dataFlow });
  }

  medium(from, to, dataFlow = {}) {
    return this.add(from, to, { strength: 'medium', dataFlow });
  }

  weak(from, to, dataFlow = {}) {
    return this.add(from, to, { strength: 'weak', dataFlow });
  }

  build() {
    return this.dependencies;
  }
}

export default DependencyBuilder;

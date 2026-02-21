/**
 * @fileoverview Atom Builder
 * 
 * Builder for molecule atoms test scenarios.
 * 
 * @module tests/factories/module-system-test/builders/atom-builder
 */

export class AtomBuilder {
  constructor(name) {
    this.name = name;
    this.isExported = false;
    this.isAsync = false;
    this.hasSideEffects = false;
    this.hasNetworkCalls = false;
    this.hasDomManipulation = false;
    this.hasStorageAccess = false;
    this.hasLogging = false;
    this.calls = [];
    this.dataFlow = { outputs: [] };
  }

  static create(name) {
    return new AtomBuilder(name);
  }

  exported() {
    this.isExported = true;
    return this;
  }

  async() {
    this.isAsync = true;
    return this;
  }

  withSideEffects(...effects) {
    this.hasSideEffects = true;
    effects.forEach(effect => {
      switch (effect) {
        case 'network': this.hasNetworkCalls = true; break;
        case 'dom': this.hasDomManipulation = true; break;
        case 'storage': this.hasStorageAccess = true; break;
        case 'logging': this.hasLogging = true; break;
      }
    });
    return this;
  }

  callsExternal(name, args = []) {
    this.calls.push({
      name,
      type: 'external',
      args: args.map(a => ({ name: a }))
    });
    return this;
  }

  callsInternal(name, args = []) {
    this.calls.push({
      name,
      type: 'internal',
      args: args.map(a => ({ name: a }))
    });
    return this;
  }

  returns(value = 'return') {
    this.dataFlow.outputs.push({ type: 'return', target: value });
    return this;
  }

  mutates(target) {
    this.dataFlow.outputs.push({ type: 'mutation', target });
    return this;
  }

  build() {
    return {
      name: this.name,
      isExported: this.isExported,
      isAsync: this.isAsync,
      hasSideEffects: this.hasSideEffects,
      hasNetworkCalls: this.hasNetworkCalls,
      hasDomManipulation: this.hasDomManipulation,
      hasStorageAccess: this.hasStorageAccess,
      hasLogging: this.hasLogging,
      calls: this.calls,
      dataFlow: this.dataFlow
    };
  }
}

export default AtomBuilder;

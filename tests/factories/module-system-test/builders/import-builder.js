/**
 * @fileoverview Import Builder
 * 
 * Builder for import test scenarios.
 * 
 * @module tests/factories/module-system-test/builders/import-builder
 */

export class ImportBuilder {
  constructor(module) {
    this.module = module;
    this.functions = [];
    this.count = 0;
    this.type = 'static';
  }

  static from(module) {
    return new ImportBuilder(module);
  }

  import(...functions) {
    this.functions.push(...functions);
    this.count = this.functions.length;
    return this;
  }

  asDynamic() {
    this.type = 'dynamic';
    return this;
  }

  countAs(n) {
    this.count = n;
    return this;
  }

  build() {
    return {
      module: this.module,
      functions: this.functions,
      count: this.count,
      type: this.type
    };
  }
}

export default ImportBuilder;

/**
 * @fileoverview Export Builder
 * 
 * Builder for export test scenarios.
 * 
 * @module tests/factories/module-system-test/builders/export-builder
 */

export class ExportBuilder {
  constructor(name) {
    this.name = name;
    this.type = 'function';
    this.file = 'index.js';
    this.usedBy = 0;
    this.isMain = false;
  }

  static create(name) {
    return new ExportBuilder(name);
  }

  asFunction() {
    this.type = 'function';
    return this;
  }

  asClass() {
    this.type = 'class';
    return this;
  }

  asHandler() {
    this.type = 'handler';
    return this;
  }

  asService() {
    this.type = 'service';
    return this;
  }

  from(file) {
    this.file = file;
    return this;
  }

  usedBy(count) {
    this.usedBy = count;
    return this;
  }

  markAsMain() {
    this.isMain = true;
    return this;
  }

  build() {
    return {
      name: this.name,
      type: this.type,
      file: this.file,
      usedBy: this.usedBy,
      isMain: this.isMain
    };
  }
}

export default ExportBuilder;

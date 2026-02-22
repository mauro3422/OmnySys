/**
 * @fileoverview SideEffectBuilder - Builder for side effects
 */

export class SideEffectBuilder {
  constructor() {
    this.effects = {
      network: false,
      storage: false,
      dom: false,
      global: false,
      console: false,
      file: false,
      externalCalls: []
    };
  }

  withNetwork() {
    this.effects.network = true;
    this.effects.externalCalls.push('fetch', 'axios');
    return this;
  }

  withStorage() {
    this.effects.storage = true;
    this.effects.externalCalls.push('localStorage', 'sessionStorage');
    return this;
  }

  withDOM() {
    this.effects.dom = true;
    this.effects.externalCalls.push('document.querySelector', 'document.createElement');
    return this;
  }

  withGlobal() {
    this.effects.global = true;
    return this;
  }

  withConsole() {
    this.effects.console = true;
    return this;
  }

  withFile() {
    this.effects.file = true;
    this.effects.externalCalls.push('fs.readFile', 'fs.writeFile');
    return this;
  }

  withAll() {
    return this.withNetwork().withStorage().withDOM().withGlobal().withConsole().withFile();
  }

  build() {
    return {
      sideEffects: this.effects,
      hasSideEffects: Object.values(this.effects).some(v => v === true)
    };
  }

  static create() {
    return new SideEffectBuilder();
  }
}

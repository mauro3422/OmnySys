/**
 * @fileoverview Global Builder - Builder for creating global variable test code
 */

export class GlobalBuilder {
  constructor() {
    this.code = '';
    this.globals = { reads: [], writes: [], all: [] };
  }

  /**
   * Add window property read
   * @param {string} prop - Property name
   * @param {string} variableName - Variable to assign to
   */
  withWindowRead(prop = 'appConfig', variableName = 'config') {
    this.code += `
const ${variableName} = window.${prop};
`;
    const line = this.code.split('\n').length - 1;
    this.globals.reads.push({ property: prop, line, type: 'read' });
    this.globals.all.push({ property: prop, line, type: 'read' });
    return this;
  }

  /**
   * Add window property write
   * @param {string} prop - Property name
   * @param {string} value - Value to assign
   */
  withWindowWrite(prop = 'appState', value = '{}') {
    this.code += `
window.${prop} = ${value};
`;
    const line = this.code.split('\n').length - 1;
    this.globals.writes.push({ property: prop, line, type: 'write' });
    this.globals.all.push({ property: prop, line, type: 'write' });
    return this;
  }

  /**
   * Add global property read
   * @param {string} prop - Property name
   */
  withGlobalRead(prop = 'sharedData') {
    this.code += `
const data = global.${prop};
`;
    const line = this.code.split('\n').length - 1;
    this.globals.reads.push({ property: prop, line, type: 'read' });
    this.globals.all.push({ property: prop, line, type: 'read' });
    return this;
  }

  /**
   * Add global property write
   * @param {string} prop - Property name
   * @param {string} value - Value to assign
   */
  withGlobalWrite(prop = 'sharedData', value = '[]') {
    this.code += `
global.${prop} = ${value};
`;
    const line = this.code.split('\n').length - 1;
    this.globals.writes.push({ property: prop, line, type: 'write' });
    this.globals.all.push({ property: prop, line, type: 'write' });
    return this;
  }

  /**
   * Add globalThis access
   * @param {string} prop - Property name
   * @param {boolean} isWrite - Whether it's a write operation
   */
  withGlobalThis(prop = 'appData', isWrite = false) {
    if (isWrite) {
      this.code += `
globalThis.${prop} = {};
`;
      const line = this.code.split('\n').length - 1;
      this.globals.writes.push({ property: prop, line, type: 'write' });
      this.globals.all.push({ property: prop, line, type: 'write' });
    } else {
      this.code += `
const data = globalThis.${prop};
`;
      const line = this.code.split('\n').length - 1;
      this.globals.reads.push({ property: prop, line, type: 'read' });
      this.globals.all.push({ property: prop, line, type: 'read' });
    }
    return this;
  }

  /**
   * Create app state global pattern
   */
  withAppStateGlobal() {
    return this
      .withWindowWrite('appState', '{ user: null, isLoggedIn: false }')
      .withWindowRead('appState', 'currentState')
      .withWindowWrite('appConfig', '{ apiUrl: "/api" }');
  }

  /**
   * Create feature flags global pattern
   */
  withFeatureFlagsGlobal() {
    return this
      .withWindowWrite('featureFlags', '{ newUI: true, betaFeature: false }')
      .withWindowRead('featureFlags', 'flags');
  }

  build() {
    return {
      code: this.code,
      globals: this.globals
    };
  }
}

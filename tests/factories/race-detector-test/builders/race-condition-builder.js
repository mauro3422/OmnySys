/**
 * @fileoverview Race Condition Builder
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

  static create() {
    return new RaceConditionBuilder();
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

/**
 * @fileoverview Entry Point Builder
 * 
 * Builder for entry point test scenarios.
 * 
 * @module tests/factories/module-system-test/builders/entry-point-builder
 */

export class EntryPointBuilder {
  constructor(type) {
    this.type = type;
    this.handler = { module: '', file: '', function: '' };
    this.middleware = [];
  }

  static api(path, method = 'GET') {
    const builder = new EntryPointBuilder('api');
    builder.path = path;
    builder.method = method;
    return builder;
  }

  static cli(command) {
    const builder = new EntryPointBuilder('cli');
    builder.command = command;
    return builder;
  }

  static event(eventName) {
    const builder = new EntryPointBuilder('event');
    builder.event = eventName;
    return builder;
  }

  static scheduled(name) {
    const builder = new EntryPointBuilder('scheduled');
    builder.name = name;
    builder.schedule = 'unknown';
    return builder;
  }

  static library(name) {
    const builder = new EntryPointBuilder('library');
    builder.name = name;
    return builder;
  }

  handledBy(module, file, func) {
    this.handler = { module, file, function: func };
    return this;
  }

  withMiddleware(name, type = 'auth') {
    this.middleware.push({ name, type });
    return this;
  }

  build() {
    const result = {
      type: this.type,
      handler: this.handler
    };

    if (this.type === 'api') {
      result.path = this.path;
      result.method = this.method;
      if (this.middleware.length) result.middleware = this.middleware;
    } else if (this.type === 'cli') {
      result.command = this.command;
    } else if (this.type === 'event') {
      result.event = this.event;
    } else if (this.type === 'scheduled') {
      result.name = this.name;
      result.schedule = this.schedule;
    } else if (this.type === 'library') {
      result.name = this.name;
    }

    return result;
  }
}

export default EntryPointBuilder;

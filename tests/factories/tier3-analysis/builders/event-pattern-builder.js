/**
 * @fileoverview EventPatternBuilder - Builder for event patterns
 */

export class EventPatternBuilder {
  constructor() {
    this.listeners = [];
    this.emitters = [];
  }

  addListener(eventName, options = {}) {
    const {
      pattern = 'on',
      objectName = 'eventBus',
      confidence = 1.0,
      filePath = 'test.js',
      line = 1,
      column = 1,
      functionContext = null
    } = options;

    this.listeners.push({
      eventName,
      pattern,
      objectName,
      confidence,
      filePath,
      line,
      column,
      functionContext
    });
    return this;
  }

  addEmitter(eventName, options = {}) {
    const {
      pattern = 'emit',
      objectName = 'eventBus',
      confidence = 1.0,
      filePath = 'test.js',
      line = 1,
      column = 1,
      functionContext = null
    } = options;

    this.emitters.push({
      eventName,
      pattern,
      objectName,
      confidence,
      filePath,
      line,
      column,
      functionContext
    });
    return this;
  }

  withStandardEvent(eventName, filePath = 'test.js') {
    this.addListener(eventName, { pattern: 'on', filePath });
    this.addEmitter(eventName, { pattern: 'emit', filePath });
    return this;
  }

  withMultipleEvents(count, prefix = 'event') {
    for (let i = 0; i < count; i++) {
      this.withStandardEvent(`${prefix}-${i}`);
    }
    return this;
  }

  build() {
    return {
      eventListeners: this.listeners,
      eventEmitters: this.emitters
    };
  }

  static create() {
    return new EventPatternBuilder();
  }
}

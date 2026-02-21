/**
 * @fileoverview Connection Builder
 * Builder for creating connection data structures
 */

export class ConnectionBuilder {
  constructor() {
    this.sharedState = [];
    this.eventListeners = [];
  }

  static create() {
    return new ConnectionBuilder();
  }

  withSharedStateConnection(connection) {
    this.sharedState.push({
      source: connection.source,
      target: connection.target,
      type: connection.type || 'shared-state',
      variable: connection.variable || 'unknown',
      line: connection.line || 1,
      ...connection
    });
    return this;
  }

  withEventListener(connection) {
    this.eventListeners.push({
      source: connection.source,
      target: connection.target,
      type: connection.type || 'event-listener',
      event: connection.event || 'click',
      line: connection.line || 1,
      ...connection
    });
    return this;
  }

  withConnection(connection) {
    if (connection.type === 'shared-state' || connection.variable) {
      return this.withSharedStateConnection(connection);
    }
    return this.withEventListener(connection);
  }

  withSharedState(count = 1) {
    for (let i = 0; i < count; i++) {
      this.withSharedStateConnection({
        source: `src/file${i}.js`,
        target: `src/file${i + 1}.js`,
        variable: `state${i}`,
        line: i + 1
      });
    }
    return this;
  }

  withEventListeners(count = 1) {
    for (let i = 0; i < count; i++) {
      this.withEventListener({
        source: `src/component${i}.js`,
        target: `src/handler${i}.js`,
        event: `event${i}`,
        line: i + 1
      });
    }
    return this;
  }

  build() {
    return {
      sharedState: this.sharedState,
      eventListeners: this.eventListeners,
      total: this.sharedState.length + this.eventListeners.length
    };
  }
}

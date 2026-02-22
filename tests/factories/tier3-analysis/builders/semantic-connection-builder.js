/**
 * @fileoverview SemanticConnectionBuilder - Builder for semantic connections
 */

export class SemanticConnectionBuilder {
  constructor() {
    this.connections = [];
  }

  addConnection(target, type = 'import', strength = 1) {
    this.connections.push({ target, type, strength });
    return this;
  }

  withHighConnectivity(count) {
    for (let i = 0; i < count; i++) {
      this.addConnection(`module${i}`, 'import', 2);
    }
    return this;
  }

  withBidirectionalConnections(pairs) {
    pairs.forEach(([a, b]) => {
      this.addConnection(a, 'export', 2);
      this.addConnection(b, 'import', 2);
    });
    return this;
  }

  build() {
    return this.connections;
  }

  static create() {
    return new SemanticConnectionBuilder();
  }
}

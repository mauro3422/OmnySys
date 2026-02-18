/**
 * @fileoverview Core Unified Server Factory
 * 
 * Builders para testing del servidor unificado
 * 
 * @module tests/factories/core-unified-server
 */

/**
 * Builder para configuración del servidor
 */
export class ServerConfigBuilder {
  constructor() {
    this.config = {
      projectPath: '/default/project',
      ports: {
        orchestrator: 9999,
        bridge: 9998
      }
    };
  }

  withProjectPath(path) {
    this.config.projectPath = path;
    return this;
  }

  withPorts(orchestrator, bridge) {
    this.config.ports.orchestrator = orchestrator;
    this.config.ports.bridge = bridge;
    return this;
  }

  withOrchestratorPort(port) {
    this.config.ports.orchestrator = port;
    return this;
  }

  withBridgePort(port) {
    this.config.ports.bridge = port;
    return this;
  }

  asDefault() {
    this.config.projectPath = process.cwd();
    this.config.ports.orchestrator = 9999;
    this.config.ports.bridge = 9998;
    return this;
  }

  build() {
    return { ...this.config };
  }

  static create() {
    return new ServerConfigBuilder();
  }
}

/**
 * Builder para requests API
 */
export class APIRequestBuilder {
  constructor() {
    this.request = {
      endpoint: '/api/status',
      method: 'GET',
      body: null,
      params: {},
      headers: {}
    };
  }

  withEndpoint(endpoint) {
    this.request.endpoint = endpoint;
    return this;
  }

  withMethod(method) {
    this.request.method = method;
    return this;
  }

  withBody(body) {
    this.request.body = body;
    return this;
  }

  withParams(params) {
    this.request.params = { ...this.request.params, ...params };
    return this;
  }

  asGet() {
    this.request.method = 'GET';
    return this;
  }

  asPost() {
    this.request.method = 'POST';
    return this;
  }

  build() {
    return { ...this.request };
  }

  static create() {
    return new APIRequestBuilder();
  }
}

/**
 * Builder para respuestas API
 */
export class APIResponseBuilder {
  constructor() {
    this.response = {
      status: 200,
      data: null,
      error: null,
      headers: {}
    };
  }

  withStatus(status) {
    this.response.status = status;
    return this;
  }

  withStatusCode(status) {
    this.response.status = status;
    return this;
  }

  withData(data) {
    this.response.data = data;
    this.response.error = null;
    return this;
  }

  withError(error) {
    this.response.error = error;
    this.response.data = null;
    return this;
  }

  asSuccess(data = {}) {
    this.response.status = 200;
    this.response.data = data;
    this.response.error = null;
    return this;
  }

  asError(message = 'Internal Server Error', status = 500) {
    this.response.status = status;
    this.response.error = { message, code: status };
    this.response.data = null;
    return this;
  }

  build() {
    return { ...this.response };
  }

  static create() {
    return new APIResponseBuilder();
  }
}

/**
 * Builder para mensajes WebSocket
 */
export class WebSocketMessageBuilder {
  constructor() {
    this.message = {
      type: 'ping',
      payload: {},
      timestamp: Date.now()
    };
  }

  withType(type) {
    this.message.type = type;
    return this;
  }

  withPayload(payload) {
    this.message.payload = payload;
    return this;
  }

  withTimestamp(timestamp) {
    this.message.timestamp = timestamp;
    return this;
  }

  asFileChange(filePath, changeType = 'modified') {
    this.message.type = 'file:change';
    this.message.payload = {
      path: filePath,
      changeType: changeType,
      timestamp: Date.now()
    };
    return this;
  }

  asAnalysisComplete(results) {
    this.message.type = 'analysis:complete';
    this.message.payload = {
      results: results,
      timestamp: Date.now()
    };
    return this;
  }

  build() {
    return { ...this.message };
  }

  static create() {
    return new WebSocketMessageBuilder();
  }
}

/**
 * Builder para estado del servidor
 */
export class ServerStateBuilder {
  constructor() {
    this.state = {
      isRunning: false,
      status: 'stopped',
      uptime: 0,
      startTime: null,
      stats: {
        totalAnalyzed: 0,
        totalQueued: 0,
        avgTime: 0,
        cacheHitRate: 0
      }
    };
  }

  asRunning() {
    this.state.isRunning = true;
    this.state.status = 'running';
    this.state.startTime = Date.now();
    return this;
  }

  asStopped() {
    this.state.isRunning = false;
    this.state.status = 'stopped';
    this.state.startTime = null;
    this.state.uptime = 0;
    return this;
  }

  asInitializing() {
    this.state.isRunning = false;
    this.state.status = 'initializing';
    this.state.startTime = Date.now();
    return this;
  }

  withUptime(uptimeMs) {
    this.state.uptime = uptimeMs;
    if (this.state.startTime) {
      this.state.startTime = Date.now() - uptimeMs;
    }
    return this;
  }

  build() {
    return { ...this.state };
  }

  static create() {
    return new ServerStateBuilder();
  }
}

export default {
  ServerConfigBuilder,
  APIRequestBuilder,
  APIResponseBuilder,
  WebSocketMessageBuilder,
  ServerStateBuilder
};

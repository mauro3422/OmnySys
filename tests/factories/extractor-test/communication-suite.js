/**
 * @fileoverview Extractor Factory - Communication Scenarios
 */

import { CodeSampleBuilder } from './core-builders.js';

export class CommunicationBuilder {
  constructor() {
    this.code = '';
    this.filePath = 'test.js';
  }

  // WebSocket patterns
  withWebSocketFull(url, events = {}) {
    this.code += `const ws = new WebSocket('${url}');
`;
    if (events.onopen) {
      this.code += `ws.onopen = ${events.onopen};
`;
    }
    if (events.onmessage) {
      this.code += `ws.onmessage = ${events.onmessage};
`;
    }
    if (events.onclose) {
      this.code += `ws.onclose = ${events.onclose};
`;
    }
    if (events.onerror) {
      this.code += `ws.onerror = ${events.onerror};
`;
    }
    this.code += '\n';
    return this;
  }

  withWebSocketSecure(url) {
    this.code += `const wss = new WebSocket('${url}');
`;
    return this;
  }

  // Network patterns
  withFetch(url, options = {}) {
    const method = options.method || 'GET';
    if (options.body) {
      this.code += `fetch('${url}', { method: '${method}', body: ${options.body} });
`;
    } else {
      this.code += `fetch('${url}');
`;
    }
    return this;
  }

  withAxios(method, url) {
    this.code += `axios.${method}('${url}');
`;
    return this;
  }

  withXHR(method, url) {
    this.code += `const xhr = new XMLHttpRequest();
xhr.open('${method}', '${url}');
xhr.send();
`;
    return this;
  }

  // Web Workers
  withWorker(workerPath, messageHandler = null) {
    this.code += `const worker = new Worker('${workerPath}');
`;
    if (messageHandler) {
      this.code += `worker.onmessage = ${messageHandler};
`;
    }
    return this;
  }

  withWorkerPostMessage(message) {
    this.code += `worker.postMessage(${message});
`;
    return this;
  }

  withSharedWorker(workerPath) {
    this.code += `const sharedWorker = new SharedWorker('${workerPath}');
`;
    return this;
  }

  withSelfPostMessage() {
    this.code += `self.postMessage({ result: data });
`;
    return this;
  }

  withOnMessage(handler) {
    this.code += `self.onmessage = ${handler};
`;
    return this;
  }

  withAddEventListenerMessage() {
    this.code += `self.addEventListener('message', handleMessage);
`;
    return this;
  }

  // BroadcastChannel
  withBroadcastChannel(channelName) {
    this.code += `const bc = new BroadcastChannel('${channelName}');
`;
    return this;
  }

  withBroadcastChannelPostMessage(message) {
    this.code += `bc.postMessage(${message});
`;
    return this;
  }

  withBroadcastChannelOnMessage(handler) {
    this.code += `bc.onmessage = ${handler};
`;
    return this;
  }

  // MessageChannel
  withMessageChannel() {
    this.code += `const { port1, port2 } = new MessageChannel();
`;
    return this;
  }

  withMessagePortPostMessage(port, message) {
    this.code += `${port}.postMessage(${message});
`;
    return this;
  }

  withMessagePortOnMessage(port, handler) {
    this.code += `${port}.onmessage = ${handler};
`;
    return this;
  }

  // Server-Sent Events
  withEventSource(url) {
    this.code += `const es = new EventSource('${url}');
`;
    return this;
  }

  withEventSourceListener(event, handler) {
    this.code += `es.addEventListener('${event}', ${handler});
`;
    return this;
  }

  // Window PostMessage
  withWindowPostMessage(target, message) {
    this.code += `${target}.postMessage(${message});
`;
    return this;
  }

  withWindowOnMessage(handler) {
    this.code += `window.onmessage = ${handler};
`;
    return this;
  }

  withWindowAddEventListenerMessage(handler) {
    this.code += `window.addEventListener('message', ${handler});
`;
    return this;
  }

  atFilePath(filePath) {
    this.filePath = filePath;
    return this;
  }

  build() {
    return {
      code: this.code,
      filePath: this.filePath
    };
  }
}

/**
 * Communication-specific test scenarios
 */

export class CommunicationScenarioFactory {
  static webSocketConnection(url = 'wss://api.example.com/socket') {
    return new CommunicationBuilder()
      .withWebSocketFull(url, {
        onopen: 'function() { console.log("open"); }',
        onmessage: 'function(e) { console.log(e.data); }',
        onclose: 'function() { console.log("close"); }',
        onerror: 'function(e) { console.error(e); }'
      })
      .build();
  }

  static webSocketMinimal(url = 'ws://localhost:8080') {
    return new CodeSampleBuilder()
      .withWebSocket(url)
      .build();
  }

  static fetchApiCall(url = '/api/users') {
    return new CommunicationBuilder()
      .withFetch(url)
      .build();
  }

  static axiosApiCall(method = 'get', url = '/api/data') {
    return new CommunicationBuilder()
      .withAxios(method, url)
      .build();
  }

  static xhrCall(method = 'POST', url = '/api/submit') {
    return new CommunicationBuilder()
      .withXHR(method, url)
      .build();
  }

  static dedicatedWorker(workerPath = './worker.js') {
    return new CommunicationBuilder()
      .withWorker(workerPath, 'handleWorkerMessage')
      .build();
  }

  static workerWithPostMessage(workerPath = './calc.worker.js') {
    return new CommunicationBuilder()
      .withWorker(workerPath)
      .withWorkerPostMessage('{ data: 123 }')
      .build();
  }

  static sharedWorker(workerPath = './shared-worker.js') {
    return new CommunicationBuilder()
      .withSharedWorker(workerPath)
      .build();
  }

  static workerCode() {
    return new CommunicationBuilder()
      .withOnMessage('function(e) { process(e.data); }')
      .withSelfPostMessage()
      .build();
  }

  static broadcastChannel(channelName = 'app-channel') {
    return new CommunicationBuilder()
      .withBroadcastChannel(channelName)
      .build();
  }

  static broadcastChannelFull(channelName = 'my-channel') {
    return new CommunicationBuilder()
      .withBroadcastChannel(channelName)
      .withBroadcastChannelPostMessage('{ type: "update" }')
      .withBroadcastChannelOnMessage('handleBroadcast')
      .build();
  }

  static messageChannel() {
    return new CommunicationBuilder()
      .withMessageChannel()
      .build();
  }

  static messageChannelWithPorts() {
    return new CommunicationBuilder()
      .withMessageChannel()
      .withMessagePortPostMessage('port1', '{ data: "hello" }')
      .withMessagePortOnMessage('port2', 'handleResponse')
      .build();
  }

  static eventSource(url = '/events/stream') {
    return new CommunicationBuilder()
      .withEventSource(url)
      .build();
  }

  static eventSourceWithListeners(url = '/sse/updates') {
    return new CommunicationBuilder()
      .withEventSource(url)
      .withEventSourceListener('update', 'onUpdate')
      .withEventSourceListener('error', 'onError')
      .build();
  }

  static windowPostMessageToParent() {
    return new CommunicationBuilder()
      .withWindowPostMessage('window.parent', '{ data: "hello" }')
      .build();
  }

  static windowPostMessageToOpener() {
    return new CommunicationBuilder()
      .withWindowPostMessage('window.opener', '{ data: "init" }')
      .build();
  }

  static windowPostMessageIncoming() {
    return new CommunicationBuilder()
      .withWindowAddEventListenerMessage('receiveMessage')
      .withWindowOnMessage('handleMessage')
      .build();
  }

  static complexCommunication() {
    // Multiple communication patterns in one file
    return new CommunicationBuilder()
      .withWebSocketFull('wss://ws.example.com', { onmessage: 'handler' })
      .withFetch('/api/data')
      .withBroadcastChannel('sync-channel')
      .build();
  }

  static emptyCode() {
    return { code: '', filePath: 'empty.js' };
  }

  static codeWithoutCommunication() {
    return new CodeSampleBuilder()
      .withFunction('regularFunction', ['a', 'b'], 'return a + b;')
      .build();
  }
}

/**
 * Communication-specific constants
 */

export const CommunicationConstants = {
  COMMUNICATION_TYPES: {
    WEBSOCKET: 'websocket_url',
    WEBSOCKET_EVENT: 'websocket_event',
    NETWORK_FETCH: 'network_fetch',
    NETWORK_XHR: 'network_xhr',
    NETWORK_AXIOS: 'network_axios',
    WORKER_CREATION: 'worker_creation',
    WORKER_POSTMESSAGE: 'worker_postMessage',
    WORKER_ONMESSAGE: 'worker_onmessage',
    SHAREDWORKER_CREATION: 'sharedworker_creation',
    BROADCAST_CHANNEL: 'broadcastChannel',
    MESSAGECHANNEL_CREATION: 'messageChannel_creation',
    MESSAGECHANNEL_PORT: 'messageChannel_port_usage',
    EVENTSOURCE_URL: 'eventsource_url',
    EVENTSOURCE_EVENT: 'eventsource_event',
    WINDOW_POSTMESSAGE_OUTGOING: 'window_postmessage_outgoing',
    WINDOW_POSTMESSAGE_LISTENER: 'window_postmessage_listener',
    WINDOW_ONMESSAGE: 'window_onmessage'
  },

  WEBSOCKET_EVENTS: ['onopen', 'onmessage', 'onclose', 'onerror'],

  NETWORK_METHODS: {
    FETCH: 'fetch',
    XHR: 'xhr',
    AXIOS: 'axios'
  },

  HTTP_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],

  WORKER_TYPES: {
    DEDICATED: 'Worker',
    SHARED: 'SharedWorker'
  }
};

/**
 * Contract definitions for communication extractors
 */

export const CommunicationExtractorContracts = {
  REQUIRED_WEBSOCKET_FIELDS: ['urls', 'events', 'all'],
  REQUIRED_NETWORK_FIELDS: ['urls', 'all'],
  REQUIRED_WORKER_FIELDS: ['incoming', 'outgoing', 'all'],
  REQUIRED_SHARED_WORKER_FIELDS: ['workers', 'all'],
  REQUIRED_BROADCAST_CHANNEL_FIELDS: ['channels', 'all'],
  REQUIRED_MESSAGE_CHANNEL_FIELDS: ['channels', 'all'],
  REQUIRED_SSE_FIELDS: ['urls', 'events', 'all'],
  REQUIRED_POSTMESSAGE_FIELDS: ['outgoing', 'incoming', 'all'],

  // All items in 'all' array must have these fields
  REQUIRED_ITEM_FIELDS: ['type', 'line'],

  // Specific fields for different types
  URL_FIELDS: ['url', 'line', 'type'],
  EVENT_FIELDS: ['event', 'line', 'type'],
  WORKER_FIELDS: ['workerPath', 'line', 'type'],
  CHANNEL_FIELDS: ['channel', 'line', 'type']
};

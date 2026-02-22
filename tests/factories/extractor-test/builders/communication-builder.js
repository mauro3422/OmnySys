/**
 * @fileoverview Communication Builder - Constructor de escenarios de comunicación
 */

import { CodeSampleBuilder } from '../core-builders.js';

export class CommunicationBuilder {
  constructor() {
    this.code = '';
    this.filePath = 'test.js';
  }

  // WebSocket patterns
  withWebSocketFull(url, events = {}) {
    this.code += `const ws = new WebSocket('${url}');\n`;
    if (events.onopen) {
      this.code += `ws.onopen = ${events.onopen};\n`;
    }
    if (events.onmessage) {
      this.code += `ws.onmessage = ${events.onmessage};\n`;
    }
    if (events.onclose) {
      this.code += `ws.onclose = ${events.onclose};\n`;
    }
    if (events.onerror) {
      this.code += `ws.onerror = ${events.onerror};\n`;
    }
    this.code += '\n';
    return this;
  }

  withWebSocketSecure(url) {
    this.code += `const wss = new WebSocket('${url}');\n`;
    return this;
  }

  // Network patterns
  withFetch(url, options = {}) {
    const method = options.method || 'GET';
    if (options.body) {
      this.code += `fetch('${url}', { method: '${method}', body: ${options.body} });\n`;
    } else {
      this.code += `fetch('${url}');\n`;
    }
    return this;
  }

  withAxios(method, url) {
    this.code += `axios.${method}('${url}');\n`;
    return this;
  }

  withXHR(method, url) {
    this.code += `const xhr = new XMLHttpRequest();\nxhr.open('${method}', '${url}');\nxhr.send();\n`;
    return this;
  }

  // Web Workers
  withWorker(workerPath, messageHandler = null) {
    this.code += `const worker = new Worker('${workerPath}');\n`;
    if (messageHandler) {
      this.code += `worker.onmessage = ${messageHandler};\n`;
    }
    return this;
  }

  withWorkerPostMessage(message) {
    this.code += `worker.postMessage(${message});\n`;
    return this;
  }

  withSharedWorker(workerPath) {
    this.code += `const sharedWorker = new SharedWorker('${workerPath}');\n`;
    return this;
  }

  withSelfPostMessage() {
    this.code += `self.postMessage({ result: data });\n`;
    return this;
  }

  withOnMessage(handler) {
    this.code += `self.onmessage = ${handler};\n`;
    return this;
  }

  withAddEventListenerMessage() {
    this.code += `self.addEventListener('message', handleMessage);\n`;
    return this;
  }

  // BroadcastChannel
  withBroadcastChannel(channelName) {
    this.code += `const bc = new BroadcastChannel('${channelName}');\n`;
    return this;
  }

  withBroadcastChannelPostMessage(message) {
    this.code += `bc.postMessage(${message});\n`;
    return this;
  }

  withBroadcastChannelOnMessage(handler) {
    this.code += `bc.onmessage = ${handler};\n`;
    return this;
  }

  // MessageChannel
  withMessageChannel() {
    this.code += `const { port1, port2 } = new MessageChannel();\n`;
    return this;
  }

  withMessagePortPostMessage(port, message) {
    this.code += `${port}.postMessage(${message});\n`;
    return this;
  }

  withMessagePortOnMessage(port, handler) {
    this.code += `${port}.onmessage = ${handler};\n`;
    return this;
  }

  // Server-Sent Events
  withEventSource(url) {
    this.code += `const es = new EventSource('${url}');\n`;
    return this;
  }

  withEventSourceListener(event, handler) {
    this.code += `es.addEventListener('${event}', ${handler});\n`;
    return this;
  }

  // Window PostMessage
  withWindowPostMessage(target, message) {
    this.code += `${target}.postMessage(${message});\n`;
    return this;
  }

  withWindowOnMessage(handler) {
    this.code += `window.onmessage = ${handler};\n`;
    return this;
  }

  withWindowAddEventListenerMessage(handler) {
    this.code += `window.addEventListener('message', ${handler});\n`;
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

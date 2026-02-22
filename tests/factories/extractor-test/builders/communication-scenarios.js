/**
 * @fileoverview Communication Scenarios - Fábrica de escenarios de comunicación
 */

import { CodeSampleBuilder } from '../core-builders.js';
import { CommunicationBuilder } from './communication-builder.js';

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

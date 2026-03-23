/**
 * @fileoverview WebSocket client helpers
 */

import { ConnectionState } from '../constants.js';

export function initializeWebSocketClientState(client, ws, id, manager) {
  client.ws = ws;
  client.id = id;
  client.manager = manager;
  client.state = ConnectionState.CONNECTED;
  client.subscriptions = null;
  client.lastPing = Date.now();
  client.metadata = {};
}

export function attachWebSocketClientHandlers(client) {
  client.ws.on('message', (data) => client.handleMessage(data));
  client.ws.on('close', () => client.handleClose());
  client.ws.on('error', (error) => client.handleError(error));
  client.ws.on('pong', () => {
    client.lastPing = Date.now();
  });
}

export function buildWebSocketClientRuntime(client, SubscriptionManager) {
  client.subscriptions = new SubscriptionManager();
}

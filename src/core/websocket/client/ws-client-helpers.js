/**
 * @fileoverview WebSocket client helpers
 */

import { ConnectionState } from '../constants.js';
import { parseMessage, createErrorMessage } from '../messaging/message-types.js';
import { handleClientCommand } from './message-handler.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:ws:client');

export function initializeWebSocketClientState(client, ws, id, manager) {
  client.ws = ws;
  client.id = id;
  client.manager = manager;
  client.state = ConnectionState.CONNECTED;
  client.subscriptions = null;
  client.lastPing = Date.now();
  client.metadata = {};
  client.logger = logger;
}

export function handleWebSocketClientMessage(client, data) {
  const message = parseMessage(data);

  if (!message) {
    client.send(createErrorMessage('Invalid JSON message'));
    return;
  }

  client.manager.emit('message', client, message);

  handleClientCommand(message, {
    subscriptions: client.subscriptions,
    send: (msg) => client.send(msg),
    emitter: client.manager,
    clientId: client.id,
    ws: client.ws
  });
}

export function handleWebSocketClientClose(client) {
  client.state = ConnectionState.DISCONNECTED;

  const subCount = client.subscriptions.clear();
  if (subCount > 0) {
    client.logger.info(`🧹 Cleaned up ${subCount} subscriptions for client ${client.id}`);
  }

  client.manager.removeClient(client.id);
}

export function handleWebSocketClientError(client, error) {
  client.logger.error(`WebSocket error for client ${client.id}:`, error.message);
  client.manager.emit('client:error', client, error);
}

export function sendWebSocketClientMessage(client, message) {
  if (client.state !== ConnectionState.CONNECTED) {
    return false;
  }

  try {
    const data = typeof message === 'string' ? message : JSON.stringify(message);
    client.ws.send(data);
    return true;
  } catch (error) {
    client.logger.error(`Failed to send message to client ${client.id}:`, error.message);
    return false;
  }
}

export function isWebSocketClientSubscribedToFile(client, filePath) {
  return client.subscriptions.isSubscribedTo(filePath);
}

export function closeWebSocketClient(client, code = 1000, reason = 'Normal closure') {
  client.state = ConnectionState.DISCONNECTING;
  client.ws.close(code, reason);
}

export function isWebSocketClientAlive(client) {
  return Date.now() - client.lastPing < client.clientTimeout;
}

export function updateWebSocketClientPing(client) {
  client.lastPing = Date.now();
}

export function getWebSocketClientStats(client) {
  return {
    id: client.id,
    state: client.state,
    alive: client.isAlive(),
    lastPing: client.lastPing,
    subscriptions: client.subscriptions?.count ?? 0,
    projectPath: client.subscriptions?.getProject?.() || null
  };
}

export function attachWebSocketClientHandlers(client) {
  client.ws.on('message', (data) => client.handleMessage(data));
  client.ws.on('close', () => client.handleClose());
  client.ws.on('error', (error) => client.handleSocketError(error));
  client.ws.on('pong', () => {
    updateWebSocketClientPing(client);
  });
}

export function buildWebSocketClientRuntime(client, SubscriptionManager) {
  client.subscriptions = new SubscriptionManager();
}

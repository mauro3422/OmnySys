/**
 * @fileoverview websocket-server.js
 * 
 * Servidor WebSocket principal
 * 
 * @module websocket/server/websocket-server
 */

import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { DEFAULT_CONFIG, Events } from '../../constants.js';
import { closeAllConnections } from '../connection-handler.js';
import {
  attachWebSocketServerListeners,
  attachConnectionContext,
  removeWebSocketClient,
  generateWebSocketClientId,
  sendWebSocketMessage,
  publishWebSocketToSubscribers,
  publishWebSocket,
  publishWebSocketToProject,
  runListeningBootstrap,
  initializeHeartbeatManager,
  getWebSocketServerStats,
  stopWebSocketServer
} from './index.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:websocket:server');

/**
 * WebSocket Manager - Servidor WebSocket con soporte para rooms, heartbeat y broadcast
 * @extends EventEmitter
 */
export class WebSocketManager extends EventEmitter {
  /**
   * @param {Object} options - Opciones de configuración
   * @param {number} options.port - Puerto (default: 9997)
   * @param {string} options.path - Path (default: '/ws')
   * @param {number} options.heartbeatInterval - Intervalo heartbeat en ms
   * @param {number} options.maxClients - Máximo de clientes
   */
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port ?? DEFAULT_CONFIG.port,
      path: options.path ?? DEFAULT_CONFIG.path,
      heartbeatInterval: options.heartbeatInterval ?? DEFAULT_CONFIG.heartbeatInterval,
      maxClients: options.maxClients ?? DEFAULT_CONFIG.maxClients,
      ...options
    };

    this.wss = null;
    this.clients = new Map();
    this.isRunning = false;
    this.heartbeatManager = null;
  }

  /**
   * Inicia el servidor WebSocket
   * @returns {Promise<void>}
   */
  async start() {
    return startWebSocketServer(this);
  }

  onConnection(ws, req) { return attachConnectionContext(this, ws, req); }
  onListening(resolve, reject) { return runListeningBootstrap(this, resolve, reject); }
  setupHeartbeatManager() { return initializeHeartbeatManager(this); }
  removeClient(clientId) { return removeWebSocketClient(this, clientId); }
  generateClientId() { return generateWebSocketClientId(); }
  sendToClient(clientId, message) { return sendWebSocketMessage(this, clientId, message); }
  publishToSubscribers(filePath, message) { return publishWebSocketToSubscribers(this, filePath, message); }
  publish(message) { return publishWebSocket(this, message); }
  publishToProject(projectPath, message) { return publishWebSocketToProject(this, projectPath, message); }
  getWebSocketServerStats() { return getWebSocketServerStats(this); }
  async stop() { closeAllConnections(this.clients); return stopWebSocketServer(this); }
}



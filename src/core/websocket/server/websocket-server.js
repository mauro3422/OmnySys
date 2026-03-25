/**
 * @fileoverview websocket-server.js
 * 
 * Servidor WebSocket principal
 * 
 * @module websocket/server/websocket-server
 */

import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { DEFAULT_CONFIG, Events } from '../constants.js';
import { closeAllConnections } from './connection-handler.js';
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
} from './websocket-server-helpers.js';
import { createLogger } from '../../utils/logger.js';

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
    if (this.isRunning) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port: this.options.port,
          path: this.options.path
        });
        attachWebSocketServerListeners(this, this.wss, resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handler de nueva conexión
   * @private
   */
  onConnection(ws, req) {
    return attachConnectionContext(this, ws, req);
  }

  /**
   * Handler cuando el servidor está escuchando
   * @private
   */
  onListening(resolve, reject) {
    return runListeningBootstrap(this, resolve, reject);
  }

  /**
   * Inicia heartbeat para detectar desconexiones
   * @private
   */
  setupHeartbeatManager() {
    return initializeHeartbeatManager(this);
  }

  /**
   * Remueve cliente del mapa
   * @param {string} clientId - ID del cliente
   */
  removeClient(clientId) {
    return removeWebSocketClient(this, clientId);
  }

  /**
   * Genera ID único para cliente
   * @returns {string}
   */
  generateClientId() {
    return generateWebSocketClientId();
  }

  /**
   * Envía mensaje a un cliente específico
   * @param {string} clientId - ID del cliente
   * @param {Object} message - Mensaje a enviar
   * @returns {boolean}
   */
  sendToClient(clientId, message) {
    return sendWebSocketMessage(this, clientId, message);
  }

  /**
   * Envía mensaje a todos los clientes suscritos a un archivo
   * @param {string} filePath - Ruta del archivo
   * @param {Object} message - Mensaje a enviar
   * @returns {number}
   */
  publishToSubscribers(filePath, message) {
    return publishWebSocketToSubscribers(this, filePath, message);
  }

  /**
   * Envía mensaje a todos los clientes
   * @param {Object} message - Mensaje a enviar
   * @returns {number}
   */
  publish(message) {
    return publishWebSocket(this, message);
  }

  /**
   * Envía mensaje a clientes de un proyecto específico
   * @param {string} projectPath - Ruta del proyecto
   * @param {Object} message - Mensaje a enviar
   * @returns {number}
   */
  publishToProject(projectPath, message) {
    return publishWebSocketToProject(this, projectPath, message);
  }

  /**
   * Obtiene estadísticas
   * @returns {Object}
   */
  getWebSocketServerStats() {
    return getWebSocketServerStats(this);
  }

  /**
   * Detiene el servidor WebSocket
   * @returns {Promise<void>}
   */
  async stop() {
    closeAllConnections(this.clients);
    return stopWebSocketServer(this);
  }
}


/**
 * @fileoverview websocket-server.js
 * 
 * Servidor WebSocket principal
 * 
 * @module websocket/server/websocket-server
 */

import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { DEFAULT_CONFIG, Events } from '../constants.js';
import { WSClient } from '../client/ws-client.js';
import { HeartbeatManager } from './heartbeat-manager.js';
import { 
  handleConnection, 
  handleDisconnection, 
  handleServerError,
  closeAllConnections 
} from './connection-handler.js';
import { createLogger } from '../../utils/logger.js';
import {
  sendToClient,
  broadcast,
  broadcastToSubscribers,
  broadcastToProject
} from '../messaging/broadcaster.js';

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

        let started = false;
        const startupErrorHandler = (error) => {
          handleServerError(error, this);

          if (!started) {
            this.wss = null;
            this.isRunning = false;
            reject(error);
          }
        };

        const listeningHandler = () => {
          started = true;
          this.wss.removeListener('error', startupErrorHandler);
          this.wss.on('error', (error) => handleServerError(error, this));
          this.onListening(resolve, reject);
        };

        this.wss.on('connection', (ws, req) => this.onConnection(ws, req));
        this.wss.once('error', startupErrorHandler);
        this.wss.once('listening', listeningHandler);
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
    const client = handleConnection(ws, req, {
      clients: this.clients,
      maxClients: this.options.maxClients,
      generateClientId: () => this.generateClientId(),
      createClient: (ws, id) => new WSClient(ws, id, this),
      emitter: this
    });

    // Sobrescribir removeClient para usar nuestro handler
    if (client) {
      const originalClose = client.handleClose.bind(client);
      client.handleClose = () => {
        handleDisconnection(client.id, { clients: this.clients, emitter: this });
        originalClose();
      };
    }
  }

  /**
   * Handler cuando el servidor está escuchando
   * @private
   */
  onListening(resolve, reject) {
    try {
      this.isRunning = true;
      this.setupHeartbeatManager();
      logger.info(`🔌 WebSocket server listening on ws://localhost:${this.options.port}${this.options.path}`);
      this.emit(Events.STARTED);
      resolve();
    } catch (error) {
      this.isRunning = false;
      handleServerError(error, this);
      reject(error);
    }
  }

  /**
   * Inicia heartbeat para detectar desconexiones
   * @private
   */
  setupHeartbeatManager() {
    try {
      this.heartbeatManager = new HeartbeatManager({
        interval: this.options.heartbeatInterval,
        getClients: () => this.clients,
        onDeadClient: (id) => {
          const client = this.clients.get(id);
          if (client) {
            logger.info(`💀 Removing dead client: ${id}`);
            client.close(1001, 'Heartbeat timeout');
          }
        }
      });
      this.heartbeatManager.begin();
    } catch (error) {
      this.heartbeatManager = null;
      throw error;
    }
  }

  /**
   * Remueve cliente del mapa
   * @param {string} clientId - ID del cliente
   */
  removeClient(clientId) {
    handleDisconnection(clientId, { clients: this.clients, emitter: this });
  }

  /**
   * Genera ID único para cliente
   * @returns {string}
   */
  generateClientId() {
    return crypto.randomUUID();
  }

  /**
   * Envía mensaje a un cliente específico
   * @param {string} clientId - ID del cliente
   * @param {Object} message - Mensaje a enviar
   * @returns {boolean}
   */
  sendToClient(clientId, message) {
    return sendToClient(this.clients, clientId, message);
  }

  /**
   * Envía mensaje a todos los clientes suscritos a un archivo
   * @param {string} filePath - Ruta del archivo
   * @param {Object} message - Mensaje a enviar
   * @returns {number}
   */
  publishToSubscribers(filePath, message) {
    return broadcastToSubscribers(this.clients, filePath, message);
  }

  /**
   * Envía mensaje a todos los clientes
   * @param {Object} message - Mensaje a enviar
   * @returns {number}
   */
  publish(message) {
    return broadcast(this.clients, message);
  }

  /**
   * Envía mensaje a clientes de un proyecto específico
   * @param {string} projectPath - Ruta del proyecto
   * @param {Object} message - Mensaje a enviar
   * @returns {number}
   */
  publishToProject(projectPath, message) {
    return broadcastToProject(this.clients, projectPath, message);
  }

  /**
   * Obtiene estadísticas
   * @returns {Object}
   */
  getWebSocketServerStats() {
    return {
      isRunning: this.isRunning,
      port: this.options.port,
      path: this.options.path,
      clients: this.clients.size,
      maxClients: this.options.maxClients,
      heartbeatInterval: this.options.heartbeatInterval,
      heartbeatActive: !!this.heartbeatManager
    };
  }

  /**
   * Detiene el servidor WebSocket
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('🔌 Stopping WebSocket server...');

    // Detener heartbeat
    if (this.heartbeatManager) {
      this.heartbeatManager.stop();
      this.heartbeatManager = null;
    }

    // Cerrar todas las conexiones
    closeAllConnections(this.clients);

    // Cerrar servidor
    return new Promise((resolve) => {
      if (!this.wss) {
        this.isRunning = false;
        this.emit(Events.STOPPED);
        resolve();
        return;
      }

      this.wss.close(() => {
        this.isRunning = false;
        this.wss = null;
        this.emit(Events.STOPPED);
        resolve();
      });
    });
  }
}


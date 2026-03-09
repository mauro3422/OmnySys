import { statsPool } from '../../../shared/utils/stats-pool.js';
/**
 * @fileoverview ws-client.js
 * 
 * Wrapper de cliente WebSocket
 * 
 * @module websocket/client/ws-client
 */

import { ConnectionState, DEFAULT_CONFIG } from '../constants.js';
import { SubscriptionManager } from './subscription-manager.js';
import { handleClientCommand } from './message-handler.js';
import { parseMessage, createErrorMessage } from '../messaging/message-types.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:ws:client');



/**
 * Cliente WebSocket wrapper
 */
export class WSClient {
  /**
   * @param {WebSocket} ws - WebSocket nativo
   * @param {string} id - ID único del cliente
   * @param {EventEmitter} manager - Manager padre (EventEmitter)
   */
  constructor(ws, id, manager) {
    this.ws = ws;
    this.id = id;
    this.manager = manager;
    this.state = ConnectionState.CONNECTED;
    this.subscriptions = new SubscriptionManager();
    this.lastPing = Date.now();
    this.metadata = {};

    this.setupHandlers();
  }

  /**
   * Configura handlers del WebSocket nativo
   * @private
   */
  setupHandlers() {
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (error) => this.handleError(error));
    this.ws.on('pong', () => {
      this.lastPing = Date.now();
    });
  }

  /**
   * Maneja mensaje recibido
   * @param {Buffer} data - Datos recibidos
   */
  handleMessage(data) {
    const message = parseMessage(data);
    
    if (!message) {
      this.send(createErrorMessage('Invalid JSON message'));
      return;
    }

    this.manager.emit('message', this, message);
    
    handleClientCommand(message, {
      subscriptions: this.subscriptions,
      send: (msg) => this.send(msg),
      emitter: this.manager,
      clientId: this.id,
      ws: this.ws
    });
  }

  /**
   * Maneja cierre de conexión
   */
  handleClose() {
    this.state = ConnectionState.DISCONNECTED;
    
    // Limpiar subscriptions para prevenir memory leak
    const subCount = this.subscriptions.clear();
    if (subCount > 0) {
      logger.info(`🧹 Cleaned up ${subCount} subscriptions for client ${this.id}`);
    }
    
    this.manager.removeClient(this.id);
  }

  /**
   * Maneja error de conexión
   * @param {Error} error - Error ocurrido
   */
  handleError(error) {
    logger.error(`WebSocket error for client ${this.id}:`, error.message);
    this.manager.emit('client:error', this, error);
  }

  /**
   * Envía mensaje al cliente
   * @param {Object|string} message - Mensaje a enviar
   * @returns {boolean} - true si se envió exitosamente
   */
  send(message) {
    if (this.state !== ConnectionState.CONNECTED) {
      return false;
    }

    try {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(data);
      return true;
    } catch (error) {
      logger.error(`Failed to send message to client ${this.id}:`, error.message);
      return false;
    }
  }

  /**
   * Verifica si está suscrito a un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean}
   */
  isSubscribedTo(filePath) {
    return this.subscriptions.isSubscribedTo(filePath);
  }

  /**
   * Cierra la conexión
   * @param {number} code - Código de cierre
   * @param {string} reason - Razón del cierre
   */
  close(code = 1000, reason = 'Normal closure') {
    this.state = ConnectionState.DISCONNECTING;
    this.ws.close(code, reason);
  }

  /**
   * Verifica si el cliente está vivo (heartbeat)
   * @returns {boolean}
   */
  isAlive() {
    return Date.now() - this.lastPing < DEFAULT_CONFIG.clientTimeout;
  }

  /**
   * Actualiza timestamp de último ping
   */
  updatePing() {
    this.lastPing = Date.now();
  }

  /**
   * Obtiene estadísticas del cliente
   * @returns {Object}
   */
getStats() {
    return statsPool.getStats('ws-client');
  }}


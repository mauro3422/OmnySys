/**
 * @fileoverview ws-client.js
 * 
 * Wrapper de cliente WebSocket
 * 
 * @module websocket/client/ws-client
 */

import { SubscriptionManager } from '../subscription-manager.js';
import {
  initializeWebSocketClientState,
  attachWebSocketClientHandlers,
  buildWebSocketClientRuntime,
  handleWebSocketClientMessage,
  handleWebSocketClientClose,
  handleWebSocketClientError,
  sendWebSocketClientMessage,
  isWebSocketClientSubscribedToFile,
  closeWebSocketClient,
  isWebSocketClientAlive,
  updateWebSocketClientPing,
  getWebSocketClientStats
} from './index.js';



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
    initializeWebSocketClientState(this, ws, id, manager);
    buildWebSocketClientRuntime(this, SubscriptionManager);
    attachWebSocketClientHandlers(this);
  }

  /**
   * Maneja mensaje recibido
   * @param {Buffer} data - Datos recibidos
   */
  handleMessage(data) {
    return handleWebSocketClientMessage(this, data);
  }

  /**
   * Maneja cierre de conexión
   */
  handleClose() {
    return handleWebSocketClientClose(this);
  }

  /**
   * Maneja error de conexión
   * @param {Error} error - Error ocurrido
   */
  handleSocketError(error) {
    return handleWebSocketClientError(this, error);
  }

  /**
   * Envía mensaje al cliente
   * @param {Object|string} message - Mensaje a enviar
   * @returns {boolean} - true si se envió exitosamente
   */
  send(message) {
    return sendWebSocketClientMessage(this, message);
  }

  /**
   * Verifica si está suscrito a un archivo
   * @param {string} filePath - Ruta del archivo
   * @returns {boolean}
   */
  isSubscribedToFile(filePath) {
    return isWebSocketClientSubscribedToFile(this, filePath);
  }

  /**
   * Cierra la conexión
   * @param {number} code - Código de cierre
   * @param {string} reason - Razón del cierre
   */
  close(code = 1000, reason = 'Normal closure') {
    return closeWebSocketClient(this, code, reason);
  }

  /**
   * Verifica si el cliente está vivo (heartbeat)
   * @returns {boolean}
   */
  isAlive() {
    return isWebSocketClientAlive(this);
  }

  /**
   * Actualiza timestamp de último ping
   */
  updatePing() {
    return updateWebSocketClientPing(this);
  }

  /**
   * Obtiene estadísticas del cliente
   * @returns {Object}
   */
  getWebSocketClientStats() {
    return getWebSocketClientStats(this);
  }
}


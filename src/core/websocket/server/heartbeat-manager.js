/**
 * @fileoverview heartbeat-manager.js
 * 
 * Gestión de health checks y heartbeat
 * 
 * @module websocket/server/heartbeat-manager
 */

import { DEFAULT_CONFIG, CloseCodes } from '../constants.js';

/**
 * Manager de heartbeat para clientes WebSocket
 */
export class HeartbeatManager {
  /**
   * @param {Object} options - Opciones
   * @param {number} options.interval - Intervalo de heartbeat en ms
   * @param {Function} options.getClients - Función que retorna Map de clientes
   * @param {Function} options.onDeadClient - Callback cuando se detecta cliente muerto
   */
  constructor(options = {}) {
    this.interval = options.interval ?? DEFAULT_CONFIG.heartbeatInterval;
    this.getClients = options.getClients ?? (() => new Map());
    this.onDeadClient = options.onDeadClient ?? (() => {});
    this.timer = null;
    this.isRunning = false;
  }

  /**
   * Inicia el heartbeat
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.timer = setInterval(() => this.checkHealth(), this.interval);
  }

  /**
   * Detiene el heartbeat
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Verifica salud de todos los clientes
   * @private
   */
  checkHealth() {
    const clients = this.getClients();
    const deadClients = [];

    for (const [id, client] of clients) {
      if (!client.isAlive()) {
        deadClients.push(id);
      } else {
        // Enviar ping
        this.pingClient(client, id, deadClients);
      }
    }

    // Cerrar conexiones muertas
    for (const id of deadClients) {
      this.onDeadClient(id);
    }
  }

  /**
   * Envía ping a un cliente
   * @private
   * @param {WSClient} client - Cliente
   * @param {string} id - ID del cliente
   * @param {string[]} deadClients - Array para acumular clientes muertos
   */
  pingClient(client, id, deadClients) {
    try {
      client.ws.ping();
    } catch (error) {
      deadClients.push(id);
    }
  }

  /**
   * Verifica si está corriendo
   * @returns {boolean}
   */
  get running() {
    return this.isRunning;
  }
}

/**
 * Crea un heartbeat manager configurado
 * @param {Function} getClients - Función que retorna Map de clientes
 * @param {Object} options - Opciones adicionales
 * @returns {HeartbeatManager}
 */
export function createHeartbeatManager(getClients, options = {}) {
  return new HeartbeatManager({
    getClients,
    ...options
  });
}

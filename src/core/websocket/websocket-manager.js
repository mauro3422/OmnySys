/**
 * WebSocket Manager
 *
 * Maneja conexiones WebSocket nativas para notificaciones en tiempo real.
 * Reemplaza SSE con WebSocket para mejor performance y bidireccionalidad.
 *
 * Features:
 * - Bidireccional: Cliente y servidor pueden enviar mensajes
 * - Heartbeat: Detecta desconexiones rápidamente
 * - Rooms: Agrupa clientes por proyecto/interés
 * - Reconexión automática: Cliente reconecta ante desconexión
 * - Binary support: Puede enviar datos binarios eficientemente
 */

import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import crypto from 'crypto';

/**
 * Tipos de mensajes soportados
 */
export const MessageTypes = {
  // Client → Server
  SUBSCRIBE: 'subscribe',           // Suscribirse a updates de un archivo
  UNSUBSCRIBE: 'unsubscribe',       // Desuscribirse
  PING: 'ping',                     // Heartbeat
  REQUEST_ANALYSIS: 'request_analysis', // Pedir análisis manual

  // Server → Client
  FILE_CREATED: 'file:created',
  FILE_MODIFIED: 'file:modified',
  FILE_DELETED: 'file:deleted',
  ANALYSIS_STARTED: 'analysis:started',
  ANALYSIS_COMPLETED: 'analysis:completed',
  ANALYSIS_FAILED: 'analysis:failed',
  WARNING: 'warning',               // Breaking changes, etc
  ERROR: 'error',
  PONG: 'pong',                     // Heartbeat response
  SUBSCRIBED: 'subscribed',         // Confirmación de suscripción

  // Bidireccional
  BROADCAST: 'broadcast'            // Mensaje a todos los clientes
};

/**
 * Estados de conexión
 */
export const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected'
};

/**
 * Cliente WebSocket wrapper
 */
class WSClient {
  constructor(ws, id, manager) {
    this.ws = ws;
    this.id = id;
    this.manager = manager;
    this.state = ConnectionState.CONNECTED;
    this.subscriptions = new Set();  // Archivos a los que está suscrito
    this.projectPath = null;         // Proyecto asociado
    this.lastPing = Date.now();
    this.metadata = {};

    this.setupHandlers();
  }

  setupHandlers() {
    this.ws.on('message', (data) => this.handleMessage(data));
    this.ws.on('close', () => this.handleClose());
    this.ws.on('error', (error) => this.handleError(error));
    this.ws.on('pong', () => {
      this.lastPing = Date.now();
    });
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      this.manager.emit('message', this, message);
      this.handleCommand(message);
    } catch (error) {
      this.send({
        type: MessageTypes.ERROR,
        error: 'Invalid JSON message',
        details: error.message
      });
    }
  }

  handleCommand(message) {
    switch (message.type) {
      case MessageTypes.PING:
        this.send({ type: MessageTypes.PONG, timestamp: Date.now() });
        break;

      case MessageTypes.SUBSCRIBE:
        if (message.filePath) {
          this.subscriptions.add(message.filePath);
          this.send({
            type: MessageTypes.SUBSCRIBED,
            filePath: message.filePath,
            timestamp: Date.now()
          });
        }
        if (message.projectPath) {
          this.projectPath = message.projectPath;
        }
        break;

      case MessageTypes.UNSUBSCRIBE:
        if (message.filePath) {
          this.subscriptions.delete(message.filePath);
        }
        break;

      case MessageTypes.REQUEST_ANALYSIS:
        this.manager.emit('request:analysis', this, message);
        break;

      default:
        // Mensaje personalizado, re-emitir
        this.manager.emit(`command:${message.type}`, this, message);
    }
  }

  handleClose() {
    this.state = ConnectionState.DISCONNECTED;
    this.manager.removeClient(this.id);
  }

  handleError(error) {
    console.error(`WebSocket error for client ${this.id}:`, error.message);
    this.manager.emit('client:error', this, error);
  }

  /**
   * Envía mensaje al cliente
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
      console.error(`Failed to send message to client ${this.id}:`, error.message);
      return false;
    }
  }

  /**
   * Verifica si está suscrito a un archivo
   */
  isSubscribedTo(filePath) {
    // Si no tiene suscripciones específicas, recibe todo
    if (this.subscriptions.size === 0) {
      return true;
    }
    return this.subscriptions.has(filePath);
  }

  /**
   * Cierra la conexión
   */
  close(code = 1000, reason = 'Normal closure') {
    this.state = ConnectionState.DISCONNECTING;
    this.ws.close(code, reason);
  }

  /**
   * Verifica si el cliente está vivo (heartbeat)
   */
  isAlive() {
    return Date.now() - this.lastPing < 60000; // 60 segundos sin ping = muerto
  }
}

/**
 * WebSocket Manager
 */
export class WebSocketManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      port: options.port || 9997,
      path: options.path || '/ws',
      heartbeatInterval: options.heartbeatInterval || 30000, // 30s
      maxClients: options.maxClients || 100,
      ...options
    };

    this.wss = null;
    this.clients = new Map(); // id -> WSClient
    this.isRunning = false;
    this.heartbeatTimer = null;
  }

  /**
   * Inicia el servidor WebSocket
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

        this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
        this.wss.on('error', (error) => this.handleServerError(error));
        this.wss.on('listening', () => {
          this.isRunning = true;
          this.startHeartbeat();
          console.log(`🔌 WebSocket server listening on ws://localhost:${this.options.port}${this.options.path}`);
          this.emit('started');
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Maneja nueva conexión
   */
  handleConnection(ws, req) {
    // Limitar número de clientes
    if (this.clients.size >= this.options.maxClients) {
      ws.close(1013, 'Maximum clients reached'); // 1013 = Try Again Later
      return;
    }

    const clientId = this.generateClientId();
    const client = new WSClient(ws, clientId, this);
    this.clients.set(clientId, client);

    console.log(`👤 Client connected: ${clientId} (total: ${this.clients.size})`);

    // Enviar mensaje de bienvenida
    client.send({
      type: 'connected',
      clientId,
      timestamp: Date.now(),
      serverVersion: '2.0.0'
    });

    this.emit('client:connected', client);
  }

  /**
   * Remueve cliente
   */
  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`👋 Client disconnected: ${clientId} (total: ${this.clients.size})`);
      this.emit('client:disconnected', client);
    }
  }

  /**
   * Maneja errores del servidor
   */
  handleServerError(error) {
    console.error('WebSocket server error:', error);
    this.emit('error', error);
  }

  /**
   * Inicia heartbeat para detectar desconexiones
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.checkClientHealth();
    }, this.options.heartbeatInterval);
  }

  /**
   * Verifica salud de clientes
   */
  checkClientHealth() {
    const now = Date.now();
    const deadClients = [];

    for (const [id, client] of this.clients) {
      if (!client.isAlive()) {
        deadClients.push(id);
      } else {
        // Enviar ping
        try {
          client.ws.ping();
        } catch (error) {
          deadClients.push(id);
        }
      }
    }

    // Cerrar conexiones muertas
    for (const id of deadClients) {
      const client = this.clients.get(id);
      if (client) {
        console.log(`💀 Removing dead client: ${id}`);
        client.close(1001, 'Heartbeat timeout');
      }
    }
  }

  /**
   * Genera ID único para cliente
   */
  generateClientId() {
    return crypto.randomUUID();
  }

  /**
   * Envía mensaje a un cliente específico
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client) {
      return client.send(message);
    }
    return false;
  }

  /**
   * Envía mensaje a todos los clientes suscritos a un archivo
   */
  broadcastToSubscribers(filePath, message) {
    let sent = 0;
    for (const client of this.clients.values()) {
      if (client.isSubscribedTo(filePath)) {
        if (client.send(message)) {
          sent++;
        }
      }
    }
    return sent;
  }

  /**
   * Envía mensaje a todos los clientes
   */
  broadcast(message) {
    let sent = 0;
    for (const client of this.clients.values()) {
      if (client.send(message)) {
        sent++;
      }
    }
    return sent;
  }

  /**
   * Envía mensaje a clientes de un proyecto específico
   */
  broadcastToProject(projectPath, message) {
    let sent = 0;
    for (const client of this.clients.values()) {
      if (client.projectPath === projectPath) {
        if (client.send(message)) {
          sent++;
        }
      }
    }
    return sent;
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      totalClients: this.clients.size,
      maxClients: this.options.maxClients,
      port: this.options.port,
      subscriptions: Array.from(this.clients.values()).reduce(
        (sum, c) => sum + c.subscriptions.size, 0
      )
    };
  }

  /**
   * Detiene el servidor WebSocket
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🔌 Stopping WebSocket server...');

    // Detener heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Cerrar todas las conexiones
    for (const client of this.clients.values()) {
      client.close(1001, 'Server shutting down');
    }
    this.clients.clear();

    // Cerrar servidor
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.isRunning = false;
        this.emit('stopped');
        resolve();
      });
    });
  }
}

export default WebSocketManager;

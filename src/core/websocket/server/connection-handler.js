/**
 * @fileoverview connection-handler.js
 * 
 * Manejo de conexiones entrantes
 * 
 * @module websocket/server/connection-handler
 */

import { CloseCodes } from '../constants.js';
import { createConnectedMessage } from '../messaging/message-types.js';
import crypto from 'crypto';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('OmnySys:connection:handler');

/**
 * Maneja nueva conexión WebSocket
 * @param {WebSocket} ws - WebSocket nativo
 * @param {Object} context - Contexto del servidor
 * @param {Map} context.clients - Mapa de clientes
 * @param {number} context.maxClients - Máximo de clientes permitidos
 * @param {Function} context.generateClientId - Generador de IDs
 * @param {Function} context.createClient - Factory de WSClient
 * @param {EventEmitter} context.emitter - EventEmitter para notificaciones
 * @returns {Object|null} - Cliente creado o null si fue rechazado
 */
export function handleConnection(ws, _req, context) {
  const { clients, maxClients, generateClientId, createClient, emitter } = context;

  // Limitar número de clientes
  if (clients.size >= maxClients) {
    ws.close(CloseCodes.TRY_AGAIN_LATER, 'Maximum clients reached');
    return null;
  }

  const clientId = generateClientId();
  const client = createClient(ws, clientId);
  clients.set(clientId, client);

  logger.info(`👤 Client connected: ${clientId} (total: ${clients.size})`);

  // Enviar mensaje de bienvenida
  client.send(createConnectedMessage(clientId));

  emitter.emit('client:connected', client);
  
  return client;
}

/**
 * Maneja cierre de conexión de un cliente
 * @param {string} clientId - ID del cliente
 * @param {Object} context - Contexto del servidor
 * @param {Map} context.clients - Mapa de clientes
 * @param {EventEmitter} context.emitter - EventEmitter
 */
export function handleDisconnection(clientId, context) {
  const { clients, emitter } = context;
  const client = clients.get(clientId);
  
  if (client) {
    clients.delete(clientId);
    logger.info(`👋 Client disconnected: ${clientId} (total: ${clients.size})`);
    emitter.emit('client:disconnected', client);
  }
}

/**
 * Maneja error del servidor WebSocket
 * @param {Error} error - Error ocurrido
 * @param {EventEmitter} emitter - EventEmitter
 */
export function handleServerError(error, emitter) {
  logger.error('WebSocket server error:', error);
  emitter.emit('server:error', error);
}

/**
 * Cierra todas las conexiones activas
 * @param {Map} clients - Mapa de clientes
 * @param {number} code - Código de cierre
 * @param {string} reason - Razón
 */
export function closeAllConnections(clients, code = CloseCodes.GOING_AWAY, reason = 'Server shutting down') {
  for (const client of clients.values()) {
    try {
      client.close(code, reason);
    } catch (error) {
      // Ignorar errores de cierre
    }
  }
  clients.clear();
}

/**
 * Genera ID único para cliente
 * @returns {string}
 */
export function generateClientId() {
  return crypto.randomUUID();
}

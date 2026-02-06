/**
 * @fileoverview message-types.js
 * 
 * Validación y construcción de mensajes
 * 
 * @module websocket/messaging/message-types
 */

import { MessageTypes } from '../constants.js';

/**
 * Valida un mensaje recibido
 * @param {*} message - Mensaje a validar
 * @returns {boolean}
 */
export function isValidMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  if (!message.type || typeof message.type !== 'string') {
    return false;
  }
  
  return Object.values(MessageTypes).includes(message.type);
}

/**
 * Crea mensaje de error
 * @param {string} error - Mensaje de error
 * @param {string} [details] - Detalles adicionales
 * @returns {Object}
 */
export function createErrorMessage(error, details = null) {
  const message = {
    type: MessageTypes.ERROR,
    error,
    timestamp: Date.now()
  };
  
  if (details) {
    message.details = details;
  }
  
  return message;
}

/**
 * Crea mensaje de conexión exitosa
 * @param {string} clientId - ID del cliente
 * @param {string} serverVersion - Versión del servidor
 * @returns {Object}
 */
export function createConnectedMessage(clientId, serverVersion = '2.0.0') {
  return {
    type: 'connected',
    clientId,
    timestamp: Date.now(),
    serverVersion
  };
}

/**
 * Crea mensaje de confirmación de suscripción
 * @param {string} filePath - Archivo suscrito
 * @returns {Object}
 */
export function createSubscribedMessage(filePath) {
  return {
    type: MessageTypes.SUBSCRIBED,
    filePath,
    timestamp: Date.now()
  };
}

/**
 * Crea mensaje PONG (heartbeat response)
 * @returns {Object}
 */
export function createPongMessage() {
  return {
    type: MessageTypes.PONG,
    timestamp: Date.now()
  };
}

/**
 * Serializa mensaje para envío
 * @param {Object|string} message - Mensaje a serializar
 * @returns {string}
 */
export function serializeMessage(message) {
  return typeof message === 'string' ? message : JSON.stringify(message);
}

/**
 * Parsea mensaje recibido
 * @param {Buffer|string} data - Datos recibidos
 * @returns {Object|null} - Mensaje parseado o null si es inválido
 */
export function parseMessage(data) {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

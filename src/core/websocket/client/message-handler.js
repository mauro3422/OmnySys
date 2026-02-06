/**
 * @fileoverview message-handler.js
 * 
 * Manejo de comandos de cliente
 * 
 * @module websocket/client/message-handler
 */

import { MessageTypes } from '../constants.js';
import { createPongMessage, createSubscribedMessage } from '../messaging/message-types.js';

/**
 * Procesa un comando recibido del cliente
 * @param {Object} message - Mensaje recibido
 * @param {Object} context - Contexto del cliente
 * @param {SubscriptionManager} context.subscriptions - Manager de suscripciones
 * @param {Function} context.send - Función para enviar mensajes
 * @param {EventEmitter} context.emitter - Emitter para eventos
 * @param {string} context.clientId - ID del cliente
 */
export function handleClientCommand(message, context) {
  const { subscriptions, send, emitter, clientId } = context;

  switch (message.type) {
    case MessageTypes.PING:
      handlePing(send);
      break;

    case MessageTypes.SUBSCRIBE:
      handleSubscribe(message, subscriptions, send, emitter, clientId);
      break;

    case MessageTypes.UNSUBSCRIBE:
      handleUnsubscribe(message, subscriptions);
      break;

    case MessageTypes.REQUEST_ANALYSIS:
      handleRequestAnalysis(message, emitter, context);
      break;

    default:
      // Mensaje personalizado, re-emitir
      emitter.emit(`command:${message.type}`, context, message);
  }
}

/**
 * Maneja heartbeat ping
 * @param {Function} send - Función para enviar
 */
function handlePing(send) {
  send(createPongMessage());
}

/**
 * Maneja suscripción a archivo
 * @param {Object} message - Mensaje de suscripción
 * @param {SubscriptionManager} subscriptions - Manager de suscripciones
 * @param {Function} send - Función para enviar
 * @param {EventEmitter} emitter - Emitter
 * @param {string} clientId - ID del cliente
 */
function handleSubscribe(message, subscriptions, send, emitter, clientId) {
  if (message.filePath) {
    const isNew = subscriptions.subscribe(message.filePath);
    if (isNew) {
      send(createSubscribedMessage(message.filePath));
    }
  }
  
  if (message.projectPath) {
    subscriptions.setProject(message.projectPath);
  }
}

/**
 * Maneja desuscripción
 * @param {Object} message - Mensaje de desuscripción
 * @param {SubscriptionManager} subscriptions - Manager de suscripciones
 */
function handleUnsubscribe(message, subscriptions) {
  if (message.filePath) {
    subscriptions.unsubscribe(message.filePath);
  }
}

/**
 * Maneja solicitud de análisis
 * @param {Object} message - Mensaje de solicitud
 * @param {EventEmitter} emitter - Emitter
 * @param {Object} context - Contexto completo
 */
function handleRequestAnalysis(message, emitter, context) {
  emitter.emit('request:analysis', context, message);
}

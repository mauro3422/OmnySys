/**
 * @fileoverview index.js
 * 
 * Extractors de comunicación entre archivos
 * Exporta todas las funciones de detección de patrones de comunicación
 * 
 * @module extractors/communication
 */

// Web Workers
export { extractWebWorkerCommunication, extractSharedWorkerUsage } from './web-workers.js';

// Canales de comunicación
export { extractBroadcastChannel } from './broadcast-channel.js';
export { extractMessageChannel } from './message-channel.js';

// WebSocket
export { extractWebSocket } from './websocket.js';

// Server-Sent Events
export { extractServerSentEvents } from './server-sent-events.js';

// Llamadas de red
export { extractNetworkCalls } from './network-calls.js';

// Comunicación entre ventanas
export { extractWindowPostMessage } from './window-postmessage.js';

// ============================================
// Función orquestadora (API pública)
// ============================================

import { extractWebWorkerCommunication, extractSharedWorkerUsage } from './web-workers.js';
import { extractBroadcastChannel } from './broadcast-channel.js';
import { extractMessageChannel } from './message-channel.js';
import { extractWebSocket } from './websocket.js';
import { extractServerSentEvents } from './server-sent-events.js';
import { extractNetworkCalls } from './network-calls.js';
import { extractWindowPostMessage } from './window-postmessage.js';

/**
 * Detecta todas las conexiones avanzadas de comunicación en el código
 * @param {string} code - Código fuente
 * @returns {Object} - Todas las conexiones detectadas
 */
export function detectAllAdvancedConnections(code) {
  return {
    webWorkers: extractWebWorkerCommunication(code),
    sharedWorkers: extractSharedWorkerUsage(code),
    broadcastChannels: extractBroadcastChannel(code),
    messageChannels: extractMessageChannel(code),
    webSockets: extractWebSocket(code),
    serverSentEvents: extractServerSentEvents(code),
    networkCalls: extractNetworkCalls(code),
    windowPostMessage: extractWindowPostMessage(code),
    
    // Array plano de todas las conexiones para fácil iteración
    get all() {
      return [
        ...this.webWorkers.all,
        ...this.sharedWorkers.all,
        ...this.broadcastChannels.all,
        ...this.messageChannels.all,
        ...this.webSockets.all,
        ...this.serverSentEvents.all,
        ...this.networkCalls.all,
        ...this.windowPostMessage.all
      ];
    }
  };
}

// 🆕 NUEVO: Wrappers simplificados para comprehensive-extractor
export function getWebSocketConnections(code) {
  const result = extractWebSocket(code);
  return result.connections || [];
}

export function getWebWorkers(code) {
  const result = extractWebWorkerCommunication(code);
  return result.workers || [];
}

export function getPostMessages(code) {
  const result = extractWindowPostMessage(code);
  return result.messages || [];
}

export function getBroadcastChannels(code) {
  const result = extractBroadcastChannel(code);
  return result.channels || [];
}

export function getServerSentEvents(code) {
  const result = extractServerSentEvents(code);
  return result.events || [];
}

export function getMessageChannels(code) {
  const result = extractMessageChannel(code);
  return result.channels || [];
}

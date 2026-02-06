/**
 * @fileoverview broadcaster.js
 * 
 * Utilidades de broadcast para múltiples clientes
 * 
 * @module websocket/messaging/broadcaster
 */

/**
 * Envía mensaje a un cliente específico
 * @param {Map} clients - Mapa de clientes (id -> WSClient)
 * @param {string} clientId - ID del cliente destino
 * @param {Object} message - Mensaje a enviar
 * @returns {boolean} - true si se envió
 */
export function sendToClient(clients, clientId, message) {
  const client = clients.get(clientId);
  if (client) {
    return client.send(message);
  }
  return false;
}

/**
 * Envía mensaje a todos los clientes
 * @param {Map} clients - Mapa de clientes
 * @param {Object} message - Mensaje a enviar
 * @returns {number} - Cantidad de mensajes enviados
 */
export function broadcast(clients, message) {
  let sent = 0;
  for (const client of clients.values()) {
    if (client.send(message)) {
      sent++;
    }
  }
  return sent;
}

/**
 * Envía mensaje a clientes suscritos a un archivo
 * @param {Map} clients - Mapa de clientes
 * @param {string} filePath - Ruta del archivo
 * @param {Object} message - Mensaje a enviar
 * @returns {number} - Cantidad de mensajes enviados
 */
export function broadcastToSubscribers(clients, filePath, message) {
  let sent = 0;
  for (const client of clients.values()) {
    if (client.isSubscribedTo(filePath)) {
      if (client.send(message)) {
        sent++;
      }
    }
  }
  return sent;
}

/**
 * Envía mensaje a clientes de un proyecto específico
 * @param {Map} clients - Mapa de clientes
 * @param {string} projectPath - Ruta del proyecto
 * @param {Object} message - Mensaje a enviar
 * @returns {number} - Cantidad de mensajes enviados
 */
export function broadcastToProject(clients, projectPath, message) {
  let sent = 0;
  for (const client of clients.values()) {
    if (client.subscriptions.getProject() === projectPath) {
      if (client.send(message)) {
        sent++;
      }
    }
  }
  return sent;
}

/**
 * Envía mensaje a clientes que cumplan un predicado
 * @param {Map} clients - Mapa de clientes
 * @param {Function} predicate - Función (client) => boolean
 * @param {Object} message - Mensaje a enviar
 * @returns {number} - Cantidad de mensajes enviados
 */
export function broadcastWhere(clients, predicate, message) {
  let sent = 0;
  for (const client of clients.values()) {
    if (predicate(client) && client.send(message)) {
      sent++;
    }
  }
  return sent;
}

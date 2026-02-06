/**
 * @fileoverview index.js
 * 
 * Facade del módulo WebSocket
 * 
 * @module websocket
 */

// Re-exportar constantes
export { 
  MessageTypes, 
  ConnectionState, 
  CloseCodes, 
  DEFAULT_CONFIG, 
  Events 
} from './constants.js';

// Re-exportar clases principales
export { WebSocketManager } from './server/websocket-server.js';
export { WSClient } from './client/ws-client.js';
export { SubscriptionManager } from './client/subscription-manager.js';
export { HeartbeatManager } from './server/heartbeat-manager.js';

// Re-exportar handlers
export { handleClientCommand } from './client/message-handler.js';
export { 
  handleConnection, 
  handleDisconnection, 
  handleServerError,
  closeAllConnections,
  generateClientId
} from './server/connection-handler.js';

// Re-exportar messaging
export {
  sendToClient,
  broadcast,
  broadcastToSubscribers,
  broadcastToProject,
  broadcastWhere
} from './messaging/broadcaster.js';

export {
  isValidMessage,
  createErrorMessage,
  createConnectedMessage,
  createSubscribedMessage,
  createPongMessage,
  serializeMessage,
  parseMessage
} from './messaging/message-types.js';

// Default export
export { WebSocketManager as default } from './server/websocket-server.js';

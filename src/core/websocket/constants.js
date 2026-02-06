/**
 * @fileoverview constants.js
 * 
 * SSOT - Constantes del WebSocket Manager
 * 
 * @module websocket/constants
 */

/**
 * Tipos de mensajes soportados
 * @readonly
 * @enum {string}
 */
export const MessageTypes = {
  // Client → Server
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  PING: 'ping',
  REQUEST_ANALYSIS: 'request_analysis',

  // Server → Client
  FILE_CREATED: 'file:created',
  FILE_MODIFIED: 'file:modified',
  FILE_DELETED: 'file:deleted',
  ANALYSIS_STARTED: 'analysis:started',
  ANALYSIS_COMPLETED: 'analysis:completed',
  ANALYSIS_FAILED: 'analysis:failed',
  WARNING: 'warning',
  ERROR: 'error',
  PONG: 'pong',
  SUBSCRIBED: 'subscribed',

  // Bidireccional
  BROADCAST: 'broadcast'
};

/**
 * Estados de conexión
 * @readonly
 * @enum {string}
 */
export const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected'
};

/**
 * Códigos de cierre WebSocket
 * @readonly
 * @enum {number}
 */
export const CloseCodes = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED_DATA: 1003,
  NO_STATUS: 1005,
  ABNORMAL: 1006,
  INVALID_DATA: 1007,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  EXTENSION_REQUIRED: 1010,
  INTERNAL_ERROR: 1011,
  SERVICE_RESTART: 1012,
  TRY_AGAIN_LATER: 1013,
  BAD_GATEWAY: 1014
};

/**
 * Configuración por defecto
 * @constant
 */
export const DEFAULT_CONFIG = {
  port: 9997,
  path: '/ws',
  heartbeatInterval: 30000,  // 30s
  maxClients: 100,
  clientTimeout: 60000       // 60s sin ping = muerto
};

/**
 * Eventos emitidos por WebSocketManager
 * @readonly
 * @enum {string}
 */
export const Events = {
  STARTED: 'started',
  STOPPED: 'stopped',
  CLIENT_CONNECTED: 'client:connected',
  CLIENT_DISCONNECTED: 'client:disconnected',
  CLIENT_ERROR: 'client:error',
  MESSAGE: 'message',
  REQUEST_ANALYSIS: 'request:analysis',
  ERROR: 'error'
};

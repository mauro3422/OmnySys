/**
 * @fileoverview websocket-init.js
 * 
 * Inicialización del WebSocket Manager
 * 
 * @module unified-server/initialization/websocket-init
 */

import { WebSocketManager } from '../../websocket/index.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('OmnySys:websocket:init');



/**
 * Inicializa WebSocket Manager
 * @param {Object} options - Opciones de configuración
 * @param {number} options.port - Puerto (default: 9997)
 * @param {number} options.maxClients - Máximo de clientes (default: 50)
 * @returns {Promise<WebSocketManager>}
 */
export async function initializeWebSocket(options = {}) {
  const { port = 9997, maxClients = 50 } = options;
  
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('STEP 6: WebSocket Manager Initialization');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const wsManager = new WebSocketManager({
    port,
    maxClients
  });

  await wsManager.start();
  logger.info('  ✓ WebSocket Manager ready\n');
  
  return wsManager;
}

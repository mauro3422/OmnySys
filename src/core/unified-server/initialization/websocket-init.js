/**
 * @fileoverview websocket-init.js
 * 
 * Inicialización del WebSocket Manager
 * 
 * @module unified-server/initialization/websocket-init
 */

import { WebSocketManager } from '../../websocket/index.js';

/**
 * Inicializa WebSocket Manager
 * @param {Object} options - Opciones de configuración
 * @param {number} options.port - Puerto (default: 9997)
 * @param {number} options.maxClients - Máximo de clientes (default: 50)
 * @returns {Promise<WebSocketManager>}
 */
export async function initializeWebSocket(options = {}) {
  const { port = 9997, maxClients = 50 } = options;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 6: WebSocket Manager Initialization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const wsManager = new WebSocketManager({
    port,
    maxClients
  });

  await wsManager.start();
  console.log('  ✓ WebSocket Manager ready\n');
  
  return wsManager;
}

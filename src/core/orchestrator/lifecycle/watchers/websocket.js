import { WebSocketManager } from '../../../websocket/index.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('OmnySys:lifecycle');

/**
 * Initialize WebSocket manager
 */
export async function _initializeWebSocket() {
  logger.info('📡 Initializing WebSocket...');
  this.wsManager = new WebSocketManager({
    port: this.options.ports.webSocket,
    maxClients: 50
  });
  await this.wsManager.start();
  logger.info('✅ WebSocket ready\n');
}

import { createLogger } from '../../utils/logger.js';
import { HeartbeatManager } from './heartbeat-manager.js';
import { handleConnection, handleDisconnection, handleServerError } from './connection-handler.js';
import { WSClient } from '../client/ws-client.js';
import { Events } from '../constants.js';

const logger = createLogger('OmnySys:websocket:server:helpers');

export function attachWebSocketServerListeners(server, wss, resolve, reject) {
  let started = false;

  const startupErrorHandler = (error) => {
    handleServerError(error, server);

    if (!started) {
      server.wss = null;
      server.isRunning = false;
      reject(error);
    }
  };

  const listeningHandler = () => {
    started = true;
    wss.removeListener('error', startupErrorHandler);
    wss.on('error', (error) => handleServerError(error, server));
    runListeningBootstrap(server, resolve, reject);
  };

  wss.on('connection', (ws, req) => attachConnectionContext(server, ws, req));
  wss.once('error', startupErrorHandler);
  wss.once('listening', listeningHandler);
}

export function attachConnectionContext(server, ws, req) {
  const client = handleConnection(ws, req, {
    clients: server.clients,
    maxClients: server.options.maxClients,
    generateClientId: () => server.generateClientId(),
    createClient: (socket, id) => new WSClient(socket, id, server),
    emitter: server
  });

  if (client) {
    const originalClose = client.handleClose.bind(client);
    client.handleClose = () => {
      handleDisconnection(client.id, { clients: server.clients, emitter: server });
      originalClose();
    };
  }
}

export function runListeningBootstrap(server, resolve, reject) {
  try {
    server.isRunning = true;
    initializeHeartbeatManager(server);
    logger.info(`🔌 WebSocket server listening on ws://localhost:${server.options.port}${server.options.path}`);
    server.emit(Events.STARTED);
    resolve();
  } catch (error) {
    server.isRunning = false;
    handleServerError(error, server);
    reject(error);
  }
}

export function initializeHeartbeatManager(server) {
  try {
    server.heartbeatManager = new HeartbeatManager({
      interval: server.options.heartbeatInterval,
      getClients: () => server.clients,
      onDeadClient: (id) => {
        const client = server.clients.get(id);
        if (client) {
          logger.info(`💀 Removing dead client: ${id}`);
          client.close(1001, 'Heartbeat timeout');
        }
      }
    });
    server.heartbeatManager.begin();
  } catch (error) {
    server.heartbeatManager = null;
    throw error;
  }
}

export function getWebSocketServerStats(server) {
  return {
    isRunning: server.isRunning,
    port: server.options.port,
    path: server.options.path,
    clients: server.clients.size,
    maxClients: server.options.maxClients,
    heartbeatInterval: server.options.heartbeatInterval,
    heartbeatActive: !!server.heartbeatManager
  };
}

export function stopWebSocketServer(server) {
  if (!server.isRunning) {
    return Promise.resolve();
  }

  logger.info('🔌 Stopping WebSocket server...');

  if (server.heartbeatManager) {
    server.heartbeatManager.stop();
    server.heartbeatManager = null;
  }

  return new Promise((resolve) => {
    if (!server.wss) {
      server.isRunning = false;
      server.emit(Events.STOPPED);
      resolve();
      return;
    }

    server.wss.close(() => {
      server.isRunning = false;
      server.wss = null;
      server.emit(Events.STOPPED);
      resolve();
    });
  });
}

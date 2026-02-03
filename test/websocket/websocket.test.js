#!/usr/bin/env node

/**
 * WebSocket Manager Tests
 *
 * Tests modulares para el WebSocketManager.
 */

import { WebSocketManager, MessageTypes, ConnectionState } from '../../src/core/websocket/index.js';
import WebSocket from 'ws';
import {
  runTests,
  assertEquals,
  assertTrue,
  assertFalse,
  wait
} from '../helpers/test-setup.js';

// Test Suite
const websocketTests = {
  name: 'WebSocketManager',
  tests: {

    // Test 1: Crear WebSocketManager
    'should create WebSocket manager with default options': async () => {
      const wsManager = new WebSocketManager();

      assertEquals(wsManager.options.port, 9997);
      assertEquals(wsManager.options.maxClients, 100);
      assertEquals(wsManager.options.heartbeatInterval, 30000);
      assertFalse(wsManager.isRunning);
    },

    // Test 2: Crear con opciones personalizadas
    'should create WebSocket manager with custom options': async () => {
      const wsManager = new WebSocketManager({
        port: 8888,
        maxClients: 50,
        heartbeatInterval: 15000
      });

      assertEquals(wsManager.options.port, 8888);
      assertEquals(wsManager.options.maxClients, 50);
      assertEquals(wsManager.options.heartbeatInterval, 15000);
    },

    // Test 3: Iniciar servidor
    'should start WebSocket server': async () => {
      const wsManager = new WebSocketManager({ port: 9996 });

      await wsManager.start();

      assertTrue(wsManager.isRunning);
      assertEquals(wsManager.clients.size, 0);

      await wsManager.stop();
    },

    // Test 4: Cliente se conecta
    'should accept client connections': async () => {
      const wsManager = new WebSocketManager({ port: 9995 });
      await wsManager.start();

      const client = new WebSocket('ws://localhost:9995');

      await new Promise((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 2000);
      });

      assertEquals(wsManager.clients.size, 1);

      client.close();
      await wsManager.stop();
    },

    // Test 5: Cliente recibe mensaje de bienvenida
    'should send welcome message on connection': async () => {
      const wsManager = new WebSocketManager({ port: 9994 });
      await wsManager.start();

      const client = new WebSocket('ws://localhost:9994');

      const message = await new Promise((resolve, reject) => {
        client.on('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
        client.on('error', reject);
        setTimeout(() => reject(new Error('No message received')), 2000);
      });

      assertEquals(message.type, 'connected');
      assertTrue(message.clientId);
      assertTrue(message.timestamp);

      client.close();
      await wsManager.stop();
    },

    // Test 6: Cliente envía ping
    'should respond to ping with pong': async () => {
      const wsManager = new WebSocketManager({ port: 9993 });
      await wsManager.start();

      const client = new WebSocket('ws://localhost:9993');

      await wait(100); // Esperar conexión

      client.send(JSON.stringify({ type: MessageTypes.PING }));

      const response = await new Promise((resolve, reject) => {
        const handler = (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === MessageTypes.PONG) {
            client.off('message', handler);
            resolve(msg);
          }
        };
        client.on('message', handler);
        setTimeout(() => reject(new Error('No pong received')), 2000);
      });

      assertEquals(response.type, MessageTypes.PONG);
      assertTrue(response.timestamp);

      client.close();
      await wsManager.stop();
    },

    // Test 7: Suscripción a archivo
    'should handle file subscription': async () => {
      const wsManager = new WebSocketManager({ port: 9992 });
      await wsManager.start();

      const client = new WebSocket('ws://localhost:9992');
      await wait(100);

      client.send(JSON.stringify({
        type: MessageTypes.SUBSCRIBE,
        filePath: 'src/test.js'
      }));

      const response = await new Promise((resolve, reject) => {
        const handler = (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === MessageTypes.SUBSCRIBED) {
            client.off('message', handler);
            resolve(msg);
          }
        };
        client.on('message', handler);
        setTimeout(() => reject(new Error('No subscription confirmation')), 2000);
      });

      assertEquals(response.type, MessageTypes.SUBSCRIBED);
      assertEquals(response.filePath, 'src/test.js');

      client.close();
      await wsManager.stop();
    },

    // Test 8: Broadcast a suscriptores
    'should broadcast to subscribers': async () => {
      const wsManager = new WebSocketManager({ port: 9991 });
      await wsManager.start();

      // Cliente suscrito
      const subscriber = new WebSocket('ws://localhost:9991');
      await wait(100);
      subscriber.send(JSON.stringify({
        type: MessageTypes.SUBSCRIBE,
        filePath: 'src/test.js'
      }));
      await wait(100);

      // Enviar broadcast
      const sent = wsManager.broadcastToSubscribers('src/test.js', {
        type: MessageTypes.FILE_MODIFIED,
        filePath: 'src/test.js'
      });

      assertEquals(sent, 1);

      subscriber.close();
      await wsManager.stop();
    },

    // Test 9: Broadcast a todos
    'should broadcast to all clients': async () => {
      const wsManager = new WebSocketManager({ port: 9990 });
      await wsManager.start();

      // Dos clientes
      const client1 = new WebSocket('ws://localhost:9990');
      const client2 = new WebSocket('ws://localhost:9990');
      await wait(100);

      const sent = wsManager.broadcast({
        type: MessageTypes.BROADCAST,
        message: 'Hello all'
      });

      assertEquals(sent, 2);

      client1.close();
      client2.close();
      await wsManager.stop();
    },

    // Test 10: Límite de clientes
    'should limit maximum clients': async () => {
      const wsManager = new WebSocketManager({
        port: 9989,
        maxClients: 2
      });
      await wsManager.start();

      const client1 = new WebSocket('ws://localhost:9989');
      const client2 = new WebSocket('ws://localhost:9989');
      await wait(100);

      assertEquals(wsManager.clients.size, 2);

      // Tercer cliente debería ser rechazado
      const client3 = new WebSocket('ws://localhost:9989');

      await new Promise((resolve) => {
        client3.on('close', (code) => {
          resolve(code);
        });
        setTimeout(resolve, 500);
      });

      assertEquals(wsManager.clients.size, 2);

      client1.close();
      client2.close();
      await wsManager.stop();
    },

    // Test 11: Estadísticas
    'should provide statistics': async () => {
      const wsManager = new WebSocketManager({ port: 9988 });
      await wsManager.start();

      const client = new WebSocket('ws://localhost:9988');
      await wait(100);

      // Suscribir a un archivo
      client.send(JSON.stringify({
        type: MessageTypes.SUBSCRIBE,
        filePath: 'src/test.js'
      }));
      await wait(100);

      const stats = wsManager.getStats();

      assertEquals(stats.isRunning, true);
      assertEquals(stats.totalClients, 1);
      assertEquals(stats.maxClients, 100);
      assertEquals(stats.port, 9988);
      assertEquals(stats.subscriptions, 1);

      client.close();
      await wsManager.stop();
    },

    // Test 12: Evento client:connected
    'should emit client:connected event': async () => {
      const wsManager = new WebSocketManager({ port: 9987 });

      let connectedClient = null;
      wsManager.on('client:connected', (client) => {
        connectedClient = client;
      });

      await wsManager.start();

      const client = new WebSocket('ws://localhost:9987');
      await wait(100);

      assertTrue(connectedClient);
      assertTrue(connectedClient.id);

      client.close();
      await wsManager.stop();
    },

    // Test 13: Evento client:disconnected
    'should emit client:disconnected event': async () => {
      const wsManager = new WebSocketManager({ port: 9986 });

      let disconnected = false;
      wsManager.on('client:disconnected', () => {
        disconnected = true;
      });

      await wsManager.start();

      const client = new WebSocket('ws://localhost:9986');
      await wait(100);

      client.close();
      await wait(100);

      assertTrue(disconnected);

      await wsManager.stop();
    },

    // Test 14: Detener servidor
    'should stop server gracefully': async () => {
      const wsManager = new WebSocketManager({ port: 9985 });
      await wsManager.start();

      const client = new WebSocket('ws://localhost:9985');
      await wait(100);

      assertEquals(wsManager.clients.size, 1);

      await wsManager.stop();

      assertFalse(wsManager.isRunning);
      assertEquals(wsManager.clients.size, 0);
    },

    // Test 15: Múltiples suscripciones
    'should handle multiple subscriptions per client': async () => {
      const wsManager = new WebSocketManager({ port: 9984 });
      await wsManager.start();

      const client = new WebSocket('ws://localhost:9984');
      await wait(100);

      // Suscribir a múltiples archivos
      client.send(JSON.stringify({
        type: MessageTypes.SUBSCRIBE,
        filePath: 'src/a.js'
      }));
      client.send(JSON.stringify({
        type: MessageTypes.SUBSCRIBE,
        filePath: 'src/b.js'
      }));
      await wait(100);

      // Verificar suscripciones
      const wsClient = wsManager.clients.values().next().value;
      assertTrue(wsClient.isSubscribedTo('src/a.js'));
      assertTrue(wsClient.isSubscribedTo('src/b.js'));
      assertFalse(wsClient.isSubscribedTo('src/c.js'));

      client.close();
      await wsManager.stop();
    },

    // Test 16: Desuscripción
    'should handle unsubscription': async () => {
      const wsManager = new WebSocketManager({ port: 9983 });
      await wsManager.start();

      const client = new WebSocket('ws://localhost:9983');
      await wait(100);

      // Suscribir
      client.send(JSON.stringify({
        type: MessageTypes.SUBSCRIBE,
        filePath: 'src/test.js'
      }));
      await wait(50);

      // Desuscribir
      client.send(JSON.stringify({
        type: MessageTypes.UNSUBSCRIBE,
        filePath: 'src/test.js'
      }));
      await wait(50);

      const wsClient = wsManager.clients.values().next().value;
      assertFalse(wsClient.isSubscribedTo('src/test.js'));

      client.close();
      await wsManager.stop();
    }

  }
};

// Run tests
runTests(websocketTests).then(() => {
  console.log('\n✅ WebSocket tests completed');
});

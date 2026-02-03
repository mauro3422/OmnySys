/**
 * Tests para advanced-extractors.js
 * Valida detección de Web Workers, BroadcastChannel, WebSocket, etc.
 */

import {
  extractWebWorkerCommunication,
  extractBroadcastChannel,
  extractWebSocket,
  extractNetworkCalls,
  detectAllAdvancedConnections
} from '../../src/layer-b-semantic/advanced-extractors.js';

describe('Advanced Extractors', () => {
  
  describe('extractWebWorkerCommunication', () => {
    test('detecta new Worker()', () => {
      const code = `
        const worker = new Worker('./processor.js');
        worker.postMessage({ type: 'START' });
      `;
      
      const result = extractWebWorkerCommunication(code);
      
      expect(result.outgoing).toHaveLength(2);
      expect(result.outgoing.some(o => o.type === 'worker_creation')).toBe(true);
      expect(result.outgoing.some(o => o.workerPath === './processor.js')).toBe(true);
    });

    test('detecta postMessage a worker', () => {
      const code = `
        worker.postMessage({ data: 'test' });
        myWorker.postMessage('hello');
      `;
      
      const result = extractWebWorkerCommunication(code);
      
      expect(result.outgoing.filter(o => o.type === 'worker_postMessage')).toHaveLength(2);
    });

    test('detecta onmessage en worker (self)', () => {
      const code = `
        self.onmessage = function(e) {
          const data = e.data;
        };
      `;
      
      const result = extractWebWorkerCommunication(code);
      
      expect(result.incoming).toHaveLength(1);
      expect(result.incoming[0].type).toBe('worker_onmessage');
    });

    test('detecta self.postMessage desde worker', () => {
      const code = `
        self.postMessage({ result: computed });
      `;
      
      const result = extractWebWorkerCommunication(code);
      
      expect(result.outgoing).toHaveLength(1);
      expect(result.outgoing[0].type).toBe('worker_self_postMessage');
    });

    test('detecta SharedWorker', () => {
      const code = `
        const shared = new SharedWorker('./shared-worker.js');
      `;
      
      const result = extractWebWorkerCommunication(code);
      
      expect(result.outgoing.some(o => o.type === 'worker_creation')).toBe(true);
    });
  });

  describe('extractBroadcastChannel', () => {
    test('detecta new BroadcastChannel()', () => {
      const code = `
        const bc = new BroadcastChannel('app_sync');
        bc.postMessage('update');
      `;
      
      const result = extractBroadcastChannel(code);
      
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].channel).toBe('app_sync');
    });

    test('detecta múltiples canales', () => {
      const code = `
        const sync = new BroadcastChannel('sync_channel');
        const notify = new BroadcastChannel('notifications');
      `;
      
      const result = extractBroadcastChannel(code);
      
      expect(result.channels).toHaveLength(2);
      expect(result.channels.map(c => c.channel)).toContain('sync_channel');
      expect(result.channels.map(c => c.channel)).toContain('notifications');
    });
  });

  describe('extractWebSocket', () => {
    test('detecta new WebSocket()', () => {
      const code = `
        const ws = new WebSocket('wss://api.example.com/realtime');
        ws.onmessage = (e) => console.log(e.data);
      `;
      
      const result = extractWebSocket(code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('wss://api.example.com/realtime');
    });

    test('detecta ws:// y wss://', () => {
      const code = `
        const ws1 = new WebSocket('ws://localhost:8080');
        const ws2 = new WebSocket('wss://secure.server.com');
      `;
      
      const result = extractWebSocket(code);
      
      expect(result.urls).toHaveLength(2);
    });

    test('detecta eventos de WebSocket', () => {
      const code = `
        ws.onopen = () => {};
        ws.onmessage = handleMessage;
        ws.onclose = () => {};
        ws.onerror = handleError;
      `;
      
      const result = extractWebSocket(code);
      
      expect(result.events).toHaveLength(4);
      expect(result.events.map(e => e.event)).toContain('onopen');
      expect(result.events.map(e => e.event)).toContain('onmessage');
    });
  });

  describe('extractNetworkCalls', () => {
    test('detecta fetch()', () => {
      const code = `
        fetch('/api/users');
        fetch('/api/posts', { method: 'POST' });
      `;
      
      const result = extractNetworkCalls(code);
      
      expect(result.urls).toHaveLength(2);
      expect(result.urls.every(u => u.method === 'fetch')).toBe(true);
      expect(result.urls.map(u => u.url)).toContain('/api/users');
    });

    test('detecta XMLHttpRequest', () => {
      const code = `
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/data');
        xhr.send();
      `;
      
      const result = extractNetworkCalls(code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('/api/data');
    });

    test('detecta axios', () => {
      const code = `
        axios.get('/api/users');
        axios.post('/api/create', data);
        axios.put('/api/update/1', updated);
      `;
      
      const result = extractNetworkCalls(code);
      
      expect(result.urls).toHaveLength(3);
      expect(result.urls.some(u => u.method === 'get')).toBe(true);
      expect(result.urls.some(u => u.method === 'post')).toBe(true);
      expect(result.urls.some(u => u.method === 'put')).toBe(true);
    });

    test('detecta URLs con query params', () => {
      const code = `
        fetch('/api/search?q=test&limit=10');
      `;
      
      const result = extractNetworkCalls(code);
      
      expect(result.urls).toHaveLength(1);
      expect(result.urls[0].url).toBe('/api/search?q=test&limit=10');
    });
  });

  describe('detectAllAdvancedConnections (integración)', () => {
    test('detecta conexiones por BroadcastChannel compartido', () => {
      const fileSourceCode = {
        'src/TabA.js': `
          const bc = new BroadcastChannel('sync');
          bc.postMessage('update');
        `,
        'src/TabB.js': `
          const bc = new BroadcastChannel('sync');
          bc.onmessage = (e) => console.log(e.data);
        `
      };
      
      const result = detectAllAdvancedConnections(fileSourceCode);
      
      expect(result.connections.length).toBeGreaterThan(0);
      expect(result.byType.broadcastChannel).toHaveLength(1);
      expect(result.byType.broadcastChannel[0].channel).toBe('sync');
    });

    test('detecta conexiones por WebSocket URL compartida', () => {
      const fileSourceCode = {
        'src/ChatA.js': `
          const ws = new WebSocket('wss://chat.server.com');
        `,
        'src/ChatB.js': `
          const ws = new WebSocket('wss://chat.server.com');
        `
      };
      
      const result = detectAllAdvancedConnections(fileSourceCode);
      
      expect(result.byType.webSocket).toHaveLength(1);
      expect(result.byType.webSocket[0].url).toBe('wss://chat.server.com');
    });

    test('detecta conexiones por API endpoint compartido', () => {
      const fileSourceCode = {
        'src/UserService.js': `
          fetch('/api/users');
        `,
        'src/AdminPanel.js': `
          axios.get('/api/users');
        `
      };
      
      const result = detectAllAdvancedConnections(fileSourceCode);
      
      expect(result.byType.network).toHaveLength(1);
      expect(result.byType.network[0].url).toBe('/api/users');
    });

    test('detecta conexión Main -> Worker', () => {
      const fileSourceCode = {
        'src/Main.js': `
          const worker = new Worker('./Worker.js');
          worker.postMessage('start');
        `,
        'src/Worker.js': `
          self.onmessage = (e) => {
            self.postMessage('done');
          };
        `
      };
      
      const result = detectAllAdvancedConnections(fileSourceCode);
      
      expect(result.byType.worker).toHaveLength(1);
      expect(result.byType.worker[0].type).toBe('webWorker');
    });

    test('detecta worker roto (archivo no existe)', () => {
      const fileSourceCode = {
        'src/Main.js': `
          const worker = new Worker('./NonExistent.js');
        `
      };
      
      const result = detectAllAdvancedConnections(fileSourceCode);
      
      // Debe crear una conexión marcada como externa/rota
      expect(result.byType.worker).toHaveLength(1);
    });
  });
});

/**
 * Tests para static-extractors.js
 * Valida la extracción de localStorage, eventos y variables globales
 */

import { 
  extractLocalStorageKeys, 
  extractEventNames, 
  extractGlobalAccess,
  detectLocalStorageConnections,
  detectEventConnections,
  detectAllSemanticConnections
} from '../../src/layer-a-static/extractors/static-extractors.js';

describe('Static Extractors', () => {
  
  describe('extractLocalStorageKeys', () => {
    test('detecta localStorage.setItem', () => {
      const code = `
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_prefs', JSON.stringify(prefs));
      `;
      
      const result = extractLocalStorageKeys(code);
      
      expect(result.writes).toHaveLength(2);
      expect(result.writes.map(w => w.key)).toContain('auth_token');
      expect(result.writes.map(w => w.key)).toContain('user_prefs');
    });

    test('detecta localStorage.getItem', () => {
      const code = `
        const token = localStorage.getItem('auth_token');
        const prefs = localStorage.getItem('user_prefs');
      `;
      
      const result = extractLocalStorageKeys(code);
      
      expect(result.reads).toHaveLength(2);
      expect(result.reads.map(r => r.key)).toContain('auth_token');
    });

    test('detecta sessionStorage también', () => {
      const code = `
        sessionStorage.setItem('temp_data', data);
        const temp = sessionStorage.getItem('temp_data');
      `;
      
      const result = extractLocalStorageKeys(code);
      
      expect(result.all).toHaveLength(2);
    });

    test('detecta notación de corchetes', () => {
      const code = `
        localStorage['auth_token'] = token;
        const t = localStorage['auth_token'];
      `;
      
      const result = extractLocalStorageKeys(code);
      
      expect(result.all).toHaveLength(2);
      expect(result.all.every(item => item.key === 'auth_token')).toBe(true);
    });

    test('devuelve arrays vacíos si no hay localStorage', () => {
      const code = `
        const x = 1 + 2;
        console.log('hello');
      `;
      
      const result = extractLocalStorageKeys(code);
      
      expect(result.reads).toHaveLength(0);
      expect(result.writes).toHaveLength(0);
      expect(result.all).toHaveLength(0);
    });
  });

  describe('extractEventNames', () => {
    test('detecta addEventListener', () => {
      const code = `
        window.addEventListener('click', handleClick);
        element.addEventListener('keydown', handleKey);
      `;
      
      const result = extractEventNames(code);
      
      expect(result.listeners).toHaveLength(2);
      expect(result.listeners.map(l => l.event)).toContain('click');
      expect(result.listeners.map(l => l.event)).toContain('keydown');
    });

    test('detecta CustomEvent', () => {
      const code = `
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: user }));
        element.dispatchEvent(new CustomEvent('dataUpdated'));
      `;
      
      const result = extractEventNames(code);
      
      expect(result.emitters).toHaveLength(2);
      expect(result.emitters.map(e => e.event)).toContain('userLoggedIn');
      expect(result.emitters.map(e => e.event)).toContain('dataUpdated');
    });

    test('detecta EventEmitter style (.on/.emit)', () => {
      const code = `
        eventBus.on('dataReceived', handler);
        eventBus.emit('dataReceived', data);
      `;
      
      const result = extractEventNames(code);
      
      expect(result.all).toHaveLength(2);
      expect(result.all.map(e => e.event)).toContain('dataReceived');
    });

    test('detecta removeEventListener', () => {
      const code = `
        window.removeEventListener('scroll', handler);
      `;
      
      const result = extractEventNames(code);
      
      expect(result.listeners).toHaveLength(1);
      expect(result.listeners[0].event).toBe('scroll');
    });
  });

  describe('extractGlobalAccess', () => {
    test('detecta window.X', () => {
      const code = `
        window.globalState = { count: 0 };
        const state = window.globalState;
      `;
      
      const result = extractGlobalAccess(code);
      
      expect(result.all).toHaveLength(2);
      expect(result.all.every(item => item.property === 'globalState')).toBe(true);
    });

    test('detecta globalThis.X', () => {
      const code = `
        globalThis.sharedConfig = config;
      `;
      
      const result = extractGlobalAccess(code);
      
      expect(result.writes).toHaveLength(1);
      expect(result.writes[0].property).toBe('sharedConfig');
    });

    test('ignora propiedades nativas de window', () => {
      const code = `
        window.location.href = '/';
        window.console.log('test');
        window.setTimeout(fn, 1000);
      `;
      
      const result = extractGlobalAccess(code);
      
      expect(result.all).toHaveLength(0);
    });

    test('ignora constructores nativos', () => {
      const code = `
        const arr = new window.Array();
        const date = new window.Date();
      `;
      
      const result = extractGlobalAccess(code);
      
      expect(result.all).toHaveLength(0);
    });
  });

  describe('detectLocalStorageConnections', () => {
    test('detecta conexión por key compartida', () => {
      const fileResults = {
        'src/Auth.js': {
          localStorage: {
            writes: [{ key: 'token', line: 1 }],
            reads: [],
            all: [{ key: 'token', line: 1 }]
          }
        },
        'src/Api.js': {
          localStorage: {
            writes: [],
            reads: [{ key: 'token', line: 5 }],
            all: [{ key: 'token', line: 5 }]
          }
        }
      };
      
      const connections = detectLocalStorageConnections(fileResults);
      
      expect(connections).toHaveLength(1);
      expect(connections[0].key).toBe('token');
      expect(connections[0].sourceFile).toBe('src/Auth.js');
      expect(connections[0].targetFile).toBe('src/Api.js');
      expect(connections[0].confidence).toBe(1.0);
    });

    test('no crea conexión si no hay keys comunes', () => {
      const fileResults = {
        'src/A.js': {
          localStorage: {
            writes: [{ key: 'keyA', line: 1 }],
            all: [{ key: 'keyA', line: 1 }]
          }
        },
        'src/B.js': {
          localStorage: {
            writes: [{ key: 'keyB', line: 1 }],
            all: [{ key: 'keyB', line: 1 }]
          }
        }
      };
      
      const connections = detectLocalStorageConnections(fileResults);
      
      expect(connections).toHaveLength(0);
    });
  });

  describe('detectEventConnections', () => {
    test('detecta conexión por evento compartido', () => {
      const fileResults = {
        'src/Emitter.js': {
          events: {
            emitters: [{ event: 'dataReady', line: 1 }],
            listeners: [],
            all: [{ event: 'dataReady', line: 1 }]
          }
        },
        'src/Listener.js': {
          events: {
            emitters: [],
            listeners: [{ event: 'dataReady', line: 1 }],
            all: [{ event: 'dataReady', line: 1 }]
          }
        }
      };
      
      const connections = detectEventConnections(fileResults);
      
      expect(connections).toHaveLength(1);
      expect(connections[0].event).toBe('dataReady');
    });
  });

  describe('detectAllSemanticConnections (integración)', () => {
    test('detecta todas las conexiones en proyecto realista', () => {
      const fileSourceCode = {
        'src/AuthService.js': `
          export function login() {
            localStorage.setItem('auth_token', 'xyz');
          }
        `,
        'src/ApiClient.js': `
          export function fetchData() {
            const token = localStorage.getItem('auth_token');
          }
        `,
        'src/EventBus.js': `
          export const bus = {
            emit: (event) => window.dispatchEvent(new CustomEvent(event)),
            on: (event, cb) => window.addEventListener(event, cb)
          };
        `,
        'src/Component.js': `
          import { bus } from './EventBus.js';
          bus.on('userLogin', handleLogin);
        `
      };
      
      const result = detectAllSemanticConnections(fileSourceCode);
      
      // Debe detectar conexión localStorage
      expect(result.localStorageConnections.length).toBeGreaterThan(0);
      
      // Debe tener metadata de cada archivo
      expect(result.fileResults).toBeDefined();
      expect(Object.keys(result.fileResults)).toHaveLength(4);
    });
  });
});

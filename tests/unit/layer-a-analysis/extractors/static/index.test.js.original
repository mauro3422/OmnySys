/**
 * @fileoverview index.test.js
 * 
 * Tests for Static Extractor Facade
 * Tests extractSemanticFromFile, detectAllSemanticConnections, extractAllFromFiles
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/index
 */

import { describe, it, expect } from 'vitest';
import {
  extractSemanticFromFile,
  detectAllSemanticConnections,
  extractAllFromFiles,
  extractLocalStorageKeys,
  extractEventNames,
  extractGlobalAccess,
  extractRoutes,
  detectOnlyStorageConnections,
  detectOnlyEventConnections,
  detectOnlyGlobalConnections
} from '#layer-a/extractors/static/index.js';
import {
  StaticScenarios,
  StaticValidators,
  RouteBuilder,
  EnvBuilder,
  EventBuilder,
  StorageBuilder,
  GlobalBuilder,
  StaticConnectionBuilder
} from '../../../../factories/static-extractor-test.factory.js';

describe('Static Extractor Facade (index)', () => {
  const FILE_PATH = 'test/file.js';

  describe('extractSemanticFromFile', () => {
    it('should return complete semantic analysis structure', () => {
      const result = extractSemanticFromFile(FILE_PATH, '');

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('localStorage');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('globals');
      expect(result).toHaveProperty('routes');
      expect(result).toHaveProperty('envVars');
    });

    it('should include file path in result', () => {
      const result = extractSemanticFromFile(FILE_PATH, '');

      expect(result.filePath).toBe(FILE_PATH);
    });

    it('should extract localStorage keys', () => {
      const builder = new StorageBuilder();
      builder.withLocalStorageWrite('token', '"abc123"');
      const { code } = builder.build();

      const result = extractSemanticFromFile(FILE_PATH, code);

      expect(result.localStorage.all.length).toBeGreaterThanOrEqual(1);
      expect(result.localStorage.writes.some(w => w.key === 'token')).toBe(true);
    });

    it('should extract event names', () => {
      const builder = new EventBuilder();
      builder.withEventListener('click', 'handleClick');
      const { code } = builder.build();

      const result = extractSemanticFromFile(FILE_PATH, code);

      expect(result.events.all.length).toBeGreaterThanOrEqual(1);
      expect(result.events.listeners.some(e => e.event === 'click')).toBe(true);
    });

    it('should extract global variables', () => {
      const builder = new GlobalBuilder();
      builder.withWindowWrite('appState', '{}');
      const { code } = builder.build();

      const result = extractSemanticFromFile(FILE_PATH, code);

      expect(result.globals.all.length).toBeGreaterThanOrEqual(1);
      expect(result.globals.writes.some(w => w.property === 'appState')).toBe(true);
    });

    it('should extract routes', () => {
      const builder = new RouteBuilder();
      builder.withServerRoute('get', '/api/users');
      const { code } = builder.build();

      const result = extractSemanticFromFile(FILE_PATH, code);

      expect(result.routes.all.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract env vars', () => {
      const code = 'const apiUrl = process.env.API_URL;';

      const result = extractSemanticFromFile(FILE_PATH, code);

      expect(result.envVars.length).toBeGreaterThanOrEqual(1);
      expect(result.envVars.some(e => e.name === 'API_URL')).toBe(true);
    });

    it('should handle empty code', () => {
      const result = extractSemanticFromFile(FILE_PATH, '');

      expect(result.localStorage.all).toEqual([]);
      expect(result.events.all).toEqual([]);
      expect(result.globals.all).toEqual([]);
      expect(result.routes.all).toEqual([]);
      expect(result.envVars).toEqual([]);
    });
  });

  describe('detectAllSemanticConnections', () => {
    it('should detect localStorage connections', () => {
      const files = {
        'services/auth.js': `
          localStorage.setItem('token', 'abc123');
        `,
        'components/Header.jsx': `
          const token = localStorage.getItem('token');
        `
      };

      const result = detectAllSemanticConnections(files);

      expect(result).toHaveProperty('localStorageConnections');
      expect(result.localStorageConnections.length).toBeGreaterThan(0);
    });

    it('should detect event connections', () => {
      const files = {
        'emitter.js': `
          emitter.emit('user:login', { id: 1 });
        `,
        'listener.js': `
          emitter.on('user:login', handleLogin);
        `
      };

      const result = detectAllSemanticConnections(files);

      expect(result).toHaveProperty('eventConnections');
      expect(result.eventConnections.length).toBeGreaterThan(0);
    });

    it('should detect global connections', () => {
      const files = {
        'init.js': `
          window.appState = { version: '1.0' };
        `,
        'app.js': `
          const state = window.appState;
        `
      };

      const result = detectAllSemanticConnections(files);

      expect(result).toHaveProperty('globalConnections');
      expect(result.globalConnections.length).toBeGreaterThan(0);
    });

    it('should detect env connections', () => {
      const files = {
        'config/api.js': `
          const url = process.env.API_URL;
        `,
        'services/http.js': `
          const endpoint = process.env.API_URL;
        `
      };

      const result = detectAllSemanticConnections(files);

      expect(result).toHaveProperty('envConnections');
    });

    it('should detect route connections', () => {
      const files = {
        'server/routes.js': `
          app.get('/api/users', handler);
        `,
        'client/api.js': `
          fetch('/api/users');
        `
      };

      const result = detectAllSemanticConnections(files);

      expect(result).toHaveProperty('routeConnections');
    });

    it('should detect colocation connections', () => {
      const files = {
        'components/Button.js': 'export const Button = () => {};',
        'components/Button.test.js': 'test("Button", () => {});'
      };

      const result = detectAllSemanticConnections(files);

      expect(result).toHaveProperty('colocationConnections');
    });

    it('should return all connections combined', () => {
      const files = {
        'services/auth.js': `
          localStorage.setItem('token', 'abc123');
        `,
        'components/Header.jsx': `
          const token = localStorage.getItem('token');
        `
      };

      const result = detectAllSemanticConnections(files);

      expect(result).toHaveProperty('all');
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should return fileResults', () => {
      const files = {
        'file1.js': 'localStorage.setItem("key", "value");',
        'file2.js': 'const key = localStorage.getItem("key");'
      };

      const result = detectAllSemanticConnections(files);

      expect(result).toHaveProperty('fileResults');
      expect(result.fileResults).toHaveProperty('file1.js');
      expect(result.fileResults).toHaveProperty('file2.js');
    });

    it('should handle empty file map', () => {
      const result = detectAllSemanticConnections({});

      expect(result.all).toEqual([]);
      expect(result.fileResults).toEqual({});
    });
  });

  describe('extractAllFromFiles', () => {
    it('should extract from multiple files', () => {
      const files = {
        'file1.js': 'localStorage.setItem("key", "value");',
        'file2.js': 'const key = localStorage.getItem("key");'
      };

      const result = extractAllFromFiles(files);

      expect(result).toHaveProperty('file1.js');
      expect(result).toHaveProperty('file2.js');
    });

    it('should return analysis for each file', () => {
      const files = {
        'test.js': 'localStorage.setItem("key", "value");'
      };

      const result = extractAllFromFiles(files);

      expect(result['test.js']).toHaveProperty('filePath');
      expect(result['test.js']).toHaveProperty('localStorage');
      expect(result['test.js']).toHaveProperty('events');
      expect(result['test.js']).toHaveProperty('globals');
      expect(result['test.js']).toHaveProperty('routes');
      expect(result['test.js']).toHaveProperty('envVars');
    });

    it('should handle empty file map', () => {
      const result = extractAllFromFiles({});

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe('Individual extractors re-exported', () => {
    it('extractLocalStorageKeys should work', () => {
      const code = 'localStorage.setItem("key", "value");';

      const result = extractLocalStorageKeys(code);

      expect(result).toHaveProperty('reads');
      expect(result).toHaveProperty('writes');
      expect(result).toHaveProperty('all');
    });

    it('extractEventNames should work', () => {
      const code = 'document.addEventListener("click", handler);';

      const result = extractEventNames(code);

      expect(result).toHaveProperty('listeners');
      expect(result).toHaveProperty('emitters');
      expect(result).toHaveProperty('all');
    });

    it('extractGlobalAccess should work', () => {
      const code = 'window.appState = {};';

      const result = extractGlobalAccess(code);

      expect(result).toHaveProperty('reads');
      expect(result).toHaveProperty('writes');
      expect(result).toHaveProperty('all');
    });

    it('extractRoutes should work', () => {
      const code = 'app.get("/api/users", handler);';

      const result = extractRoutes('server.js', code);

      expect(result).toHaveProperty('server');
      expect(result).toHaveProperty('client');
      expect(result).toHaveProperty('all');
    });
  });

  describe('Specialized connection detectors', () => {
    it('detectOnlyStorageConnections should return only storage connections', () => {
      const files = {
        'services/auth.js': 'localStorage.setItem("token", "abc123");',
        'components/Header.jsx': 'const token = localStorage.getItem("token");'
      };

      const result = detectOnlyStorageConnections(files);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(conn => {
        expect(conn.type).toBe('localStorage');
      });
    });

    it('detectOnlyEventConnections should return only event connections', () => {
      const files = {
        'emitter.js': 'emitter.emit("event", data);',
        'listener.js': 'emitter.on("event", handler);'
      };

      const result = detectOnlyEventConnections(files);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(conn => {
        expect(conn.type).toBe('eventListener');
      });
    });

    it('detectOnlyGlobalConnections should return only global connections', () => {
      const files = {
        'init.js': 'window.appState = {};',
        'app.js': 'const state = window.appState;'
      };

      const result = detectOnlyGlobalConnections(files);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(conn => {
        expect(conn.type).toBe('globalVariable');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle null code gracefully', () => {
      expect(() => extractSemanticFromFile(FILE_PATH, null)).not.toThrow();
    });

    it('should handle undefined code gracefully', () => {
      expect(() => extractSemanticFromFile(FILE_PATH, undefined)).not.toThrow();
    });

    it('should handle invalid code gracefully', () => {
      const invalidCode = 'not valid javascript {';
      
      expect(() => extractSemanticFromFile(FILE_PATH, invalidCode)).not.toThrow();
    });

    it('should handle empty connections input', () => {
      expect(() => detectAllSemanticConnections({})).not.toThrow();
    });
  });

  describe('Factory pattern integration', () => {
    it('should work with StaticScenarios', () => {
      const scenario = StaticScenarios.simpleStorage();

      const result = extractSemanticFromFile(FILE_PATH, scenario.code);

      expect(result.localStorage.all.length).toBeGreaterThan(0);
    });

    it('should work with RouteBuilder', () => {
      const builder = new RouteBuilder();
      builder.withServerRoute('get', '/api/users');
      const { code } = builder.build();

      const result = extractRoutes('server.js', code);

      expect(result.server.length).toBeGreaterThan(0);
    });

    it('should work with StorageBuilder', () => {
      const builder = new StorageBuilder();
      builder.withLocalStorageWrite('token', '"abc123"')
        .withLocalStorageRead('token', 'savedToken');
      const { code } = builder.build();

      const result = extractLocalStorageKeys(code);

      expect(result.all.length).toBeGreaterThanOrEqual(2);
    });

    it('should work with EventBuilder', () => {
      const builder = new EventBuilder();
      builder.withEventListener('click', 'handleClick')
        .withCustomEvent('custom-event', '{}');
      const { code } = builder.build();

      const result = extractEventNames(code);

      expect(result.all.length).toBeGreaterThanOrEqual(2);
    });

    it('should work with GlobalBuilder', () => {
      const builder = new GlobalBuilder();
      builder.withWindowWrite('appState', '{}')
        .withWindowRead('appState', 'state');
      const { code } = builder.build();

      const result = extractGlobalAccess(code);

      expect(result.all.length).toBeGreaterThanOrEqual(2);
    });

    it('should work with StaticConnectionBuilder', () => {
      const builder = new StaticConnectionBuilder();
      builder.withSharedStorageScenario();
      const files = builder.build();

      const codeMap = {};
      for (const [path, data] of Object.entries(files)) {
        codeMap[path] = data.code;
      }

      const result = detectAllSemanticConnections(codeMap);

      expect(result.localStorageConnections.length).toBeGreaterThan(0);
    });
  });
});

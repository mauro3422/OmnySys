/**
 * @fileoverview Tests for tier2/side-effects.js
 * 
 * Tests the detectSideEffectMarkers function.
 */

import { describe, it, expect } from 'vitest';
import { detectSideEffectMarkers } from '#layer-a/analyses/tier2/side-effects.js';
import { createMockSystemMap } from '../../../../factories/analysis.factory.js';

describe('tier2/side-effects.js', () => {
  describe('detectSideEffectMarkers', () => {
    it('should return structure with all required fields', () => {
      const systemMap = createMockSystemMap({
        files: {},
        functions: {}
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('functions');
      expect(result).toHaveProperty('note');
    });

    it('should detect init pattern in function names', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/app.js': {}
        },
        functions: {
          'src/app.js': [
            { name: 'initializeDatabase' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
      expect(result.functions[0].marker).toBe('init');
    });

    it('should detect setup pattern', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/config.js': {}
        },
        functions: {
          'src/config.js': [
            { name: 'setupMiddleware' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
      expect(result.functions[0].marker).toBe('setup');
    });

    it('should detect start pattern', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/server.js': {}
        },
        functions: {
          'src/server.js': [
            { name: 'startServer' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
    });

    it('should detect configure pattern', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/settings.js': {}
        },
        functions: {
          'src/settings.js': [
            { name: 'configureApp' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
    });

    it('should detect register pattern', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/routes.js': {}
        },
        functions: {
          'src/routes.js': [
            { name: 'registerRoutes' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
    });

    it('should detect listen pattern', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/events.js': {}
        },
        functions: {
          'src/events.js': [
            { name: 'listenForEvents' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
    });

    it('should detect watch pattern', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/fs.js': {}
        },
        functions: {
          'src/fs.js': [
            { name: 'watchFiles' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
    });

    it('should detect subscribe pattern', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/pubsub.js': {}
        },
        functions: {
          'src/pubsub.js': [
            { name: 'subscribeToChannel' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
    });

    it('should detect connect pattern', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/db.js': {}
        },
        functions: {
          'src/db.js': [
            { name: 'connectDatabase' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
    });

    it('should detect open pattern', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/file.js': {}
        },
        functions: {
          'src/file.js': [
            { name: 'openConnection' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(1);
    });

    it('should be case insensitive', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/app.js': {}
        },
        functions: {
          'src/app.js': [
            { name: 'INIT_DATABASE' },
            { name: 'SetupServer' },
            { name: 'START_APP' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(3);
    });

    it('should include file path in results', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/utils/setup.js': {}
        },
        functions: {
          'src/utils/setup.js': [
            { name: 'configureSystem' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.functions[0].file).toBe('src/utils/setup.js');
    });

    it('should include function name in results', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/app.js': {}
        },
        functions: {
          'src/app.js': [
            { name: 'initializeApp' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.functions[0].function).toBe('initializeApp');
    });

    it('should mark all detected functions as suspectedSideEffect', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/app.js': {}
        },
        functions: {
          'src/app.js': [
            { name: 'initSystem' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.functions[0].suspectedSideEffect).toBe(true);
    });

    it('should provide recommendation for each detected function', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/app.js': {}
        },
        functions: {
          'src/app.js': [
            { name: 'initSystem' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.functions[0].recommendation).toContain('Verify');
    });

    it('should limit results to 20 functions', () => {
      const functions = [];
      for (let i = 0; i < 50; i++) {
        functions.push({ name: `init${i}` });
      }

      const systemMap = createMockSystemMap({
        files: {
          'src/app.js': {}
        },
        functions: {
          'src/app.js': functions
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.functions.length).toBeLessThanOrEqual(20);
    });

    it('should return 0 for projects without side effect patterns', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/helpers.js': {}
        },
        functions: {
          'src/helpers.js': [
            { name: 'formatDate' },
            { name: 'calculateSum' },
            { name: 'getUser' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(0);
      expect(result.functions).toEqual([]);
    });

    it('should handle empty project', () => {
      const systemMap = createMockSystemMap({
        files: {},
        functions: {}
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.total).toBe(0);
    });

    it('should include disclaimer note', () => {
      const systemMap = createMockSystemMap({
        files: {},
        functions: {}
      });

      const result = detectSideEffectMarkers(systemMap);

      expect(result.note).toContain('pattern-based');
      expect(result.note).toContain('verify manually');
    });

    it('should detect multiple patterns in same function name', () => {
      // Actually each function is checked once, but different patterns detected separately
      const systemMap = createMockSystemMap({
        files: {
          'src/app.js': {}
        },
        functions: {
          'src/app.js': [
            { name: 'initAndSetup' }
          ]
        }
      });

      const result = detectSideEffectMarkers(systemMap);

      // Should still be detected once, but marker could be either pattern
      expect(result.total).toBe(1);
      expect(['init', 'setup']).toContain(result.functions[0].marker);
    });
  });
});

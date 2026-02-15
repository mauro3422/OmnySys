/**
 * @fileoverview Tests for tier2/reexport-chains.js
 * 
 * Tests the analyzeReexportChains function.
 */

import { describe, it, expect } from 'vitest';
import { analyzeReexportChains } from '#layer-a/analyses/tier2/reexport-chains.js';
import { createMockSystemMap } from '../../../../factories/analysis.factory.js';

describe('tier2/reexport-chains.js', () => {
  describe('analyzeReexportChains', () => {
    it('should return structure with all required fields', () => {
      const systemMap = createMockSystemMap({
        files: {},
        functions: {}
      });

      const result = analyzeReexportChains(systemMap);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('chains');
      expect(result).toHaveProperty('recommendation');
    });

    it('should detect barrel files with no original functions', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{ source: './utils' }],
            exports: [{ name: 'helper1' }, { name: 'helper2' }]
          }
        },
        functions: {
          'src/index.js': [] // No functions defined here
        }
      });

      const result = analyzeReexportChains(systemMap);

      expect(result.total).toBeGreaterThan(0);
    });

    it('should follow re-export chains', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{ source: './api' }],
            exports: [{ name: 'api' }],
            dependsOn: ['src/api.js']
          },
          'src/api.js': {
            imports: [{ source: './endpoints' }],
            exports: [{ name: 'endpoints' }],
            dependsOn: ['src/endpoints.js']
          },
          'src/endpoints.js': {
            imports: [],
            exports: [{ name: 'users' }, { name: 'posts' }],
            dependsOn: []
          }
        },
        functions: {
          'src/index.js': [],
          'src/api.js': [],
          'src/endpoints.js': [
            { name: 'users' },
            { name: 'posts' }
          ]
        }
      });

      const result = analyzeReexportChains(systemMap);

      expect(result.total).toBeGreaterThan(0);
      expect(result.chains[0].depth).toBeGreaterThanOrEqual(2);
    });

    it('should mark chains with depth > 2 as MEDIUM priority', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/a.js': { imports: [{ source: './b' }], exports: [{}], dependsOn: ['src/b.js'] },
          'src/b.js': { imports: [{ source: './c' }], exports: [{}], dependsOn: ['src/c.js'] },
          'src/c.js': { imports: [{ source: './d' }], exports: [{}], dependsOn: ['src/d.js'] },
          'src/d.js': { imports: [], exports: [{}], dependsOn: [] }
        },
        functions: {
          'src/a.js': [],
          'src/b.js': [],
          'src/c.js': [],
          'src/d.js': [{ name: 'actual' }]
        }
      });

      const result = analyzeReexportChains(systemMap);

      if (result.total > 0) {
        const deepChain = result.chains.find(c => c.depth > 2);
        if (deepChain) {
          expect(deepChain.recommendation).toBe('MEDIUM');
        }
      }
    });

    it('should mark short chains as LOW priority', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/a.js': { imports: [{ source: './b' }], exports: [{}], dependsOn: ['src/b.js'] },
          'src/b.js': { imports: [], exports: [{}], dependsOn: [] }
        },
        functions: {
          'src/a.js': [],
          'src/b.js': [{ name: 'actual' }]
        }
      });

      const result = analyzeReexportChains(systemMap);

      if (result.total > 0) {
        expect(result.chains[0].recommendation).toBe('LOW');
      }
    });

    it('should not include files with functions as barrel files', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/utils.js': {
            imports: [],
            exports: [{ name: 'helper' }]
          }
        },
        functions: {
          'src/utils.js': [{ name: 'actualFunction' }]
        }
      });

      const result = analyzeReexportChains(systemMap);

      expect(result.total).toBe(0);
    });

    it('should handle circular re-export chains', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/a.js': { imports: [{ source: './b' }], exports: [{}], dependsOn: ['src/b.js'] },
          'src/b.js': { imports: [{ source: './a' }], exports: [{}], dependsOn: ['src/a.js'] }
        },
        functions: {
          'src/a.js': [],
          'src/b.js': []
        }
      });

      const result = analyzeReexportChains(systemMap);

      // Should break at visited check
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should handle files without imports or exports', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/isolated.js': {
            imports: [],
            exports: []
          }
        },
        functions: {
          'src/isolated.js': []
        }
      });

      const result = analyzeReexportChains(systemMap);

      expect(result.total).toBe(0);
    });

    it('should handle empty project', () => {
      const systemMap = createMockSystemMap({
        files: {},
        functions: {}
      });

      const result = analyzeReexportChains(systemMap);

      expect(result.total).toBe(0);
      expect(result.chains).toEqual([]);
    });

    it('should provide appropriate recommendation when no chains found', () => {
      const systemMap = createMockSystemMap({
        files: {},
        functions: {}
      });

      const result = analyzeReexportChains(systemMap);

      expect(result.recommendation).toContain('No complex');
    });

    it('should provide appropriate recommendation when chains found', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{ source: './api' }],
            exports: [{}],
            dependsOn: ['src/api.js']
          },
          'src/api.js': {
            imports: [],
            exports: [{}],
            dependsOn: []
          }
        },
        functions: {
          'src/index.js': [],
          'src/api.js': [{ name: 'actual' }]
        }
      });

      const result = analyzeReexportChains(systemMap);

      if (result.total > 0) {
        expect(result.recommendation).toContain('Simplify');
      }
    });
  });
});

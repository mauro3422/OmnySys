/**
 * @fileoverview Tests for tier2/unused-imports.js
 * 
 * Tests the findUnusedImports function.
 */

import { describe, it, expect } from 'vitest';
import { findUnusedImports } from '#layer-a/analyses/tier2/unused-imports.js';
import { createMockSystemMap } from '../../../../factories/analysis.factory.js';

describe('tier2/unused-imports.js', () => {
  describe('findUnusedImports', () => {
    it('should return structure with all required fields', () => {
      const systemMap = createMockSystemMap({
        files: {},
        functions: {}
      });

      const result = findUnusedImports(systemMap);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byFile');
      expect(result).toHaveProperty('recommendation');
    });

    it('should detect unused named imports', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'named', imported: 'formatDate', local: 'formatDate' }]
            }],
            calls: [],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(1);
      expect(result.byFile['src/index.js'][0].name).toBe('formatDate');
    });

    it('should detect used named imports', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'named', imported: 'formatDate', local: 'formatDate' }]
            }],
            calls: [{ name: 'formatDate' }],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(0);
    });

    it('should detect unused default imports', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'default', local: 'utils' }]
            }],
            calls: [],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(1);
      expect(result.byFile['src/index.js'][0].type).toBe('default');
    });

    it('should detect used default imports', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'default', local: 'utils' }]
            }],
            calls: [],
            identifierRefs: ['utils']
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(0);
    });

    it('should detect unused namespace imports', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'namespace', local: 'Utils' }]
            }],
            calls: [],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(1);
      expect(result.byFile['src/index.js'][0].type).toBe('namespace');
    });

    it('should detect used namespace imports via property access', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'namespace', local: 'Utils' }]
            }],
            calls: [{ name: 'Utils.formatDate' }],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(0);
    });

    it('should detect used imports via function calls in functions array', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'named', imported: 'formatDate', local: 'formatDate' }]
            }],
            calls: [],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': [
            { name: 'main', calls: [{ name: 'formatDate' }] }
          ]
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(0);
    });

    it('should detect used imports via function_links', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'named', imported: 'formatDate', local: 'formatDate' }]
            }],
            calls: [],
            identifierRefs: []
          },
          'src/other.js': {
            imports: [],
            calls: [],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': [],
          'src/other.js': [{ name: 'user' }]
        },
        function_links: [
          { from: 'src/other.js:user', to: 'src/index.js:formatDate', file_to: 'src/index.js' }
        ]
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(0);
    });

    it('should handle imports with alias (local != imported)', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'named', imported: 'formatDate', local: 'fmt' }]
            }],
            calls: [{ name: 'fmt' }],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(0);
    });

    it('should handle multiple imports in same file', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [
                { type: 'named', imported: 'used', local: 'used' },
                { type: 'named', imported: 'unused', local: 'unused' }
              ]
            }],
            calls: [{ name: 'used' }],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(1);
      expect(result.byFile['src/index.js'][0].name).toBe('unused');
    });

    it('should include import source in results', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './helpers',
              specifiers: [{ type: 'named', imported: 'unused', local: 'unused' }]
            }],
            calls: [],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.byFile['src/index.js'][0].source).toBe('./helpers');
    });

    it('should include severity in results', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'named', imported: 'unused', local: 'unused' }]
            }],
            calls: [],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.byFile['src/index.js'][0].severity).toBe('warning');
    });

    it('should provide appropriate recommendation when unused imports found', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'named', imported: 'unused', local: 'unused' }]
            }],
            calls: [],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.recommendation).toContain('Remove');
      expect(result.recommendation).toContain('1');
    });

    it('should provide positive recommendation when no unused imports', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/index.js': {
            imports: [{
              source: './utils',
              specifiers: [{ type: 'named', imported: 'used', local: 'used' }]
            }],
            calls: [{ name: 'used' }],
            identifierRefs: []
          }
        },
        functions: {
          'src/index.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.recommendation).toContain('All imports are used');
    });

    it('should handle files without imports', () => {
      const systemMap = createMockSystemMap({
        files: {
          'src/simple.js': {
            imports: [],
            calls: [],
            identifierRefs: []
          }
        },
        functions: {
          'src/simple.js': []
        }
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(0);
    });

    it('should handle empty project', () => {
      const systemMap = createMockSystemMap({
        files: {},
        functions: {}
      });

      const result = findUnusedImports(systemMap);

      expect(result.total).toBe(0);
    });
  });
});

/**
 * @fileoverview context-connections.test.js
 * 
 * Tests for context-connections.js
 * 
 * @module tests/unit/layer-a-analysis/extractors/state-management/connections/context-connections
 */

import { describe, it, expect } from 'vitest';
import {
  detectContextConnections,
  indexContextProviders,
  indexContextConsumers,
  getAllContextNames
} from '#layer-a/extractors/state-management/connections/context-connections.js';
import { ConnectionType, DEFAULT_CONFIDENCE } from '#layer-a/extractors/state-management/constants.js';
import { StateConnectionBuilder, ContextBuilder } from '../../../../../factories/state-management-test.factory.js';

describe('Context Connections', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export all functions', () => {
      expect(typeof detectContextConnections).toBe('function');
      expect(typeof indexContextProviders).toBe('function');
      expect(typeof indexContextConsumers).toBe('function');
      expect(typeof getAllContextNames).toBe('function');
    });
  });

  // ============================================================================
  // detectContextConnections
  // ============================================================================
  describe('detectContextConnections', () => {
    it('should return empty array for empty input', () => {
      const result = detectContextConnections({});
      expect(result).toEqual([]);
    });

    it('should return empty array when no providers or consumers', () => {
      const fileResults = {
        'test.js': {
          context: { providers: [], consumers: [] }
        }
      };
      const result = detectContextConnections(fileResults);
      expect(result).toEqual([]);
    });

    it('should detect connection from provider to consumer', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'AuthContext', line: 1 }],
            consumers: []
          }
        },
        'consumer.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext', line: 1 }]
          }
        }
      };

      const connections = detectContextConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0]).toHaveProperty('sourceFile', 'provider.js');
      expect(connections[0]).toHaveProperty('targetFile', 'consumer.js');
      expect(connections[0]).toHaveProperty('contextName', 'AuthContext');
    });

    it('should create connection with correct type', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'ThemeContext' }],
            consumers: []
          }
        },
        'consumer.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'ThemeContext' }]
          }
        }
      };

      const connections = detectContextConnections(fileResults);

      expect(connections[0].type).toBe(ConnectionType.CONTEXT_USAGE);
    });

    it('should create connection with confidence value', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }],
            consumers: []
          }
        },
        'consumer.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const connections = detectContextConnections(fileResults);

      expect(connections[0].confidence).toBe(DEFAULT_CONFIDENCE.context);
    });

    it('should not create connection within same file', () => {
      const fileResults = {
        'both.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }],
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const connections = detectContextConnections(fileResults);

      expect(connections).toHaveLength(0);
    });

    it('should create multiple connections for multiple consumers', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }],
            consumers: []
          }
        },
        'consumer1.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext' }]
          }
        },
        'consumer2.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const connections = detectContextConnections(fileResults);

      expect(connections.length).toBe(2);
    });

    it('should create multiple connections for multiple contexts', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [
              { contextName: 'AuthContext' },
              { contextName: 'ThemeContext' }
            ],
            consumers: []
          }
        },
        'consumer.js': {
          context: {
            providers: [],
            consumers: [
              { contextName: 'AuthContext' },
              { contextName: 'ThemeContext' }
            ]
          }
        }
      };

      const connections = detectContextConnections(fileResults);

      expect(connections.length).toBe(4); // 2 contexts x 1 consumer each
    });

    it('should include reason in connection', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }],
            consumers: []
          }
        },
        'consumer.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const connections = detectContextConnections(fileResults);

      expect(connections[0]).toHaveProperty('reason');
      expect(typeof connections[0].reason).toBe('string');
      expect(connections[0].reason).toContain('AuthContext');
    });

    it('should include via field set to react-context', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }],
            consumers: []
          }
        },
        'consumer.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const connections = detectContextConnections(fileResults);

      expect(connections[0].via).toBe('react-context');
    });

    it('should create unique connection IDs', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }],
            consumers: []
          }
        },
        'consumer1.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext' }]
          }
        },
        'consumer2.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const connections = detectContextConnections(fileResults);
      const ids = connections.map(c => c.id);
      const uniqueIds = [...new Set(ids)];

      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  // ============================================================================
  // indexContextProviders
  // ============================================================================
  describe('indexContextProviders', () => {
    it('should return empty Map for empty input', () => {
      const result = indexContextProviders({});
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should index providers by context name', () => {
      const fileResults = {
        'auth.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const index = indexContextProviders(fileResults);

      expect(index.has('AuthContext')).toBe(true);
      expect(index.get('AuthContext')).toContain('auth.js');
    });

    it('should aggregate multiple providers for same context', () => {
      const fileResults = {
        'auth1.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }]
          }
        },
        'auth2.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const index = indexContextProviders(fileResults);

      expect(index.get('AuthContext')).toHaveLength(2);
      expect(index.get('AuthContext')).toContain('auth1.js');
      expect(index.get('AuthContext')).toContain('auth2.js');
    });

    it('should handle multiple contexts', () => {
      const fileResults = {
        'auth.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }]
          }
        },
        'theme.js': {
          context: {
            providers: [{ contextName: 'ThemeContext' }]
          }
        }
      };

      const index = indexContextProviders(fileResults);

      expect(index.has('AuthContext')).toBe(true);
      expect(index.has('ThemeContext')).toBe(true);
    });

    it('should handle files without providers', () => {
      const fileResults = {
        'empty.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const index = indexContextProviders(fileResults);

      expect(index.size).toBe(0);
    });
  });

  // ============================================================================
  // indexContextConsumers
  // ============================================================================
  describe('indexContextConsumers', () => {
    it('should return empty Map for empty input', () => {
      const result = indexContextConsumers({});
      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should index consumers by context name', () => {
      const fileResults = {
        'consumer.js': {
          context: {
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const index = indexContextConsumers(fileResults);

      expect(index.has('AuthContext')).toBe(true);
      expect(index.get('AuthContext')).toContain('consumer.js');
    });

    it('should aggregate multiple consumers for same context', () => {
      const fileResults = {
        'consumer1.js': {
          context: {
            consumers: [{ contextName: 'AuthContext' }]
          }
        },
        'consumer2.js': {
          context: {
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const index = indexContextConsumers(fileResults);

      expect(index.get('AuthContext')).toHaveLength(2);
    });

    it('should handle files without consumers', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }],
            consumers: []
          }
        }
      };

      const index = indexContextConsumers(fileResults);

      expect(index.size).toBe(0);
    });
  });

  // ============================================================================
  // getAllContextNames
  // ============================================================================
  describe('getAllContextNames', () => {
    it('should return empty array for empty input', () => {
      const result = getAllContextNames({});
      expect(result).toEqual([]);
    });

    it('should return all provider context names', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [
              { contextName: 'AuthContext' },
              { contextName: 'ThemeContext' }
            ],
            consumers: []
          }
        }
      };

      const names = getAllContextNames(fileResults);

      expect(names).toContain('AuthContext');
      expect(names).toContain('ThemeContext');
    });

    it('should return all consumer context names', () => {
      const fileResults = {
        'consumer.js': {
          context: {
            providers: [],
            consumers: [
              { contextName: 'AuthContext' },
              { contextName: 'ThemeContext' }
            ]
          }
        }
      };

      const names = getAllContextNames(fileResults);

      expect(names).toContain('AuthContext');
      expect(names).toContain('ThemeContext');
    });

    it('should combine provider and consumer names without duplicates', () => {
      const fileResults = {
        'provider.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }],
            consumers: []
          }
        },
        'consumer.js': {
          context: {
            providers: [],
            consumers: [{ contextName: 'AuthContext' }]
          }
        }
      };

      const names = getAllContextNames(fileResults);

      expect(names).toHaveLength(1);
      expect(names[0]).toBe('AuthContext');
    });

    it('should return array of strings', () => {
      const fileResults = {
        'test.js': {
          context: {
            providers: [{ contextName: 'AuthContext' }],
            consumers: []
          }
        }
      };

      const names = getAllContextNames(fileResults);

      names.forEach(name => {
        expect(typeof name).toBe('string');
      });
    });
  });

  // ============================================================================
  // Integration with Factory
  // ============================================================================
  describe('Integration with Factory', () => {
    it('should work with StateConnectionBuilder', () => {
      const builder = new StateConnectionBuilder();
      builder.withContextChain();
      const fileResults = builder.buildFileResults();

      const connections = detectContextConnections(fileResults);

      expect(Array.isArray(connections)).toBe(true);
    });

    it('should work with ContextBuilder', () => {
      const builder = new ContextBuilder();
      builder.withCompleteContext('TestContext');

      const fileResults = {
        'test.js': {
          filePath: 'test.js',
          redux: { selectors: [], actions: [], reducers: [], stores: [], thunks: [] },
          context: {
            contexts: [{ name: 'TestContext' }],
            providers: [{ contextName: 'TestContext', line: 1 }],
            consumers: [],
            all: [{ type: 'context_creation' }, { type: 'context_provider' }]
          }
        }
      };

      const index = indexContextProviders(fileResults);

      expect(index.has('TestContext')).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling Contract
  // ============================================================================
  describe('Error Handling Contract', () => {
    it('should handle missing context property', () => {
      const fileResults = {
        'test.js': {}
      };

      expect(() => detectContextConnections(fileResults)).not.toThrow();
      expect(() => indexContextProviders(fileResults)).not.toThrow();
      expect(() => indexContextConsumers(fileResults)).not.toThrow();
    });

    it('should handle missing providers/consumers arrays', () => {
      const fileResults = {
        'test.js': {
          context: {}
        }
      };

      expect(() => detectContextConnections(fileResults)).not.toThrow();
      const connections = detectContextConnections(fileResults);
      expect(connections).toEqual([]);
    });

    it('should handle null/undefined entries', () => {
      const fileResults = {
        'test.js': null
      };

      expect(() => detectContextConnections(fileResults)).not.toThrow();
    });

    it('should handle empty fileResults', () => {
      expect(detectContextConnections({})).toEqual([]);
      expect([...indexContextProviders({}).keys()]).toEqual([]);
      expect([...indexContextConsumers({}).keys()]).toEqual([]);
      expect(getAllContextNames({})).toEqual([]);
    });
  });
});

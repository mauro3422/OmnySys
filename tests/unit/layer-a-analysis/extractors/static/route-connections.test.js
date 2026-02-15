/**
 * @fileoverview route-connections.test.js
 * 
 * Tests for Route Connections
 * Tests detectRouteConnections, sharesRoutes, getSharedRoutes
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/route-connections
 */

import { describe, it, expect } from 'vitest';
import {
  detectRouteConnections,
  sharesRoutes,
  getSharedRoutes
} from '#layer-a/extractors/static/route-connections.js';
import { ConnectionType } from '#layer-a/extractors/static/constants.js';
import { StaticConnectionBuilder } from '../../../../factories/static-extractor-test.factory.js';

describe('Route Connections', () => {
  describe('detectRouteConnections', () => {
    it('should detect connections between server and client routes', () => {
      const fileResults = {
        'server.js': {
          routes: {
            server: [{ route: '/api/users', method: 'GET', line: 1, type: 'server' }],
            client: [],
            all: [{ route: '/api/users', line: 1, type: 'server', method: 'GET' }]
          }
        },
        'client.js': {
          routes: {
            server: [],
            client: [{ route: '/api/users', line: 1, type: 'client' }],
            all: [{ route: '/api/users', line: 1, type: 'client' }]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].type).toBe(ConnectionType.SHARED_ROUTE);
    });

    it('should create connection with correct structure', () => {
      const fileResults = {
        'a.js': {
          routes: {
            server: [{ route: '/api/test', method: 'GET', line: 1, type: 'server' }],
            client: [],
            all: [{ route: '/api/test', line: 1, type: 'server', method: 'GET' }]
          }
        },
        'b.js': {
          routes: {
            server: [],
            client: [{ route: '/api/test', line: 1, type: 'client' }],
            all: [{ route: '/api/test', line: 1, type: 'client' }]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections[0]).toHaveProperty('id');
      expect(connections[0]).toHaveProperty('sourceFile');
      expect(connections[0]).toHaveProperty('targetFile');
      expect(connections[0]).toHaveProperty('type');
      expect(connections[0]).toHaveProperty('route');
      expect(connections[0]).toHaveProperty('normalizedRoute');
      expect(connections[0]).toHaveProperty('direction');
      expect(connections[0]).toHaveProperty('confidence');
    });

    it('should determine direction from server to client', () => {
      const fileResults = {
        'server.js': {
          routes: {
            server: [{ route: '/api/users', method: 'GET', line: 1, type: 'server' }],
            client: [],
            all: [{ route: '/api/users', line: 1, type: 'server', method: 'GET' }]
          }
        },
        'client.js': {
          routes: {
            server: [],
            client: [{ route: '/api/users', line: 1, type: 'client' }],
            all: [{ route: '/api/users', line: 1, type: 'client' }]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections[0].sourceFile).toBe('server.js');
      expect(connections[0].targetFile).toBe('client.js');
      expect(connections[0].direction).toContain('serves');
    });

    it('should handle normalized routes', () => {
      const fileResults = {
        'server.js': {
          routes: {
            server: [{ route: '/api/users/:id', method: 'GET', line: 1, type: 'server' }],
            client: [],
            all: [{ route: '/api/users/:id', line: 1, type: 'server', method: 'GET' }]
          }
        },
        'client.js': {
          routes: {
            server: [],
            client: [{ route: '/api/users/123', line: 1, type: 'client' }],
            all: [{ route: '/api/users/123', line: 1, type: 'client' }]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections[0].normalizedRoute).toBeDefined();
    });

    it('should handle multiple shared routes', () => {
      const fileResults = {
        'server.js': {
          routes: {
            server: [
              { route: '/api/users', method: 'GET', line: 1, type: 'server' },
              { route: '/api/posts', method: 'GET', line: 2, type: 'server' }
            ],
            client: [],
            all: [
              { route: '/api/users', line: 1, type: 'server', method: 'GET' },
              { route: '/api/posts', line: 2, type: 'server', method: 'GET' }
            ]
          }
        },
        'client.js': {
          routes: {
            server: [],
            client: [
              { route: '/api/users', line: 1, type: 'client' },
              { route: '/api/posts', line: 2, type: 'client' }
            ],
            all: [
              { route: '/api/users', line: 1, type: 'client' },
              { route: '/api/posts', line: 2, type: 'client' }
            ]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections.length).toBe(2);
    });

    it('should return empty array when no shared routes', () => {
      const fileResults = {
        'a.js': {
          routes: {
            server: [{ route: '/api/a', method: 'GET', line: 1, type: 'server' }],
            client: [],
            all: [{ route: '/api/a', line: 1, type: 'server', method: 'GET' }]
          }
        },
        'b.js': {
          routes: {
            server: [],
            client: [{ route: '/api/b', line: 1, type: 'client' }],
            all: [{ route: '/api/b', line: 1, type: 'client' }]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections).toEqual([]);
    });

    it('should handle empty file results', () => {
      const connections = detectRouteConnections({});

      expect(connections).toEqual([]);
    });

    it('should handle single file', () => {
      const fileResults = {
        'only.js': {
          routes: { server: [], client: [], all: [] }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections).toEqual([]);
    });

    it('should work with StaticConnectionBuilder shared route scenario', () => {
      const builder = new StaticConnectionBuilder();
      builder.withSharedRouteScenario();
      const files = builder.build();

      const fileResults = {};
      for (const [path, data] of Object.entries(files)) {
        fileResults[path] = { routes: data.routes };
      }

      const connections = detectRouteConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      connections.forEach(conn => {
        expect(conn.type).toBe(ConnectionType.SHARED_ROUTE);
      });
    });

    it('should handle both client routes accessing same endpoint', () => {
      const fileResults = {
        'client1.js': {
          routes: {
            server: [],
            client: [{ route: '/api/data', line: 1, type: 'client' }],
            all: [{ route: '/api/data', line: 1, type: 'client' }]
          }
        },
        'client2.js': {
          routes: {
            server: [],
            client: [{ route: '/api/data', line: 1, type: 'client' }],
            all: [{ route: '/api/data', line: 1, type: 'client' }]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0].direction).toContain('both');
    });
  });

  describe('sharesRoutes', () => {
    it('should return true when routes are shared', () => {
      const routesA = {
        all: [{ route: '/api/users' }, { route: '/api/posts' }]
      };
      const routesB = {
        all: [{ route: '/api/users' }]
      };

      const result = sharesRoutes(routesA, routesB);

      expect(result).toBe(true);
    });

    it('should return false when no routes are shared', () => {
      const routesA = { all: [{ route: '/api/a' }] };
      const routesB = { all: [{ route: '/api/b' }] };

      const result = sharesRoutes(routesA, routesB);

      expect(result).toBe(false);
    });

    it('should handle normalized route comparison', () => {
      const routesA = { all: [{ route: '/api/users/:id' }] };
      const routesB = { all: [{ route: '/api/users/123' }] };

      const result = sharesRoutes(routesA, routesB);

      expect(result).toBe(true);
    });

    it('should return false when first has no routes', () => {
      const routesA = { all: [] };
      const routesB = { all: [{ route: '/api/test' }] };

      const result = sharesRoutes(routesA, routesB);

      expect(result).toBe(false);
    });

    it('should return false when second has no routes', () => {
      const routesA = { all: [{ route: '/api/test' }] };
      const routesB = { all: [] };

      const result = sharesRoutes(routesA, routesB);

      expect(result).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
      expect(sharesRoutes(null, { all: [] })).toBe(false);
      expect(sharesRoutes({ all: [] }, null)).toBe(false);
      expect(sharesRoutes(undefined, { all: [] })).toBe(false);
    });
  });

  describe('getSharedRoutes', () => {
    it('should return shared route paths', () => {
      const routesA = {
        all: [{ route: '/api/users' }, { route: '/api/posts' }]
      };
      const routesB = {
        all: [{ route: '/api/users' }, { route: '/api/comments' }]
      };

      const result = getSharedRoutes(routesA, routesB);

      expect(result).toContain('/api/users');
      expect(result).not.toContain('/api/posts');
      expect(result).not.toContain('/api/comments');
    });

    it('should return normalized routes', () => {
      const routesA = { all: [{ route: '/api/users/:id' }] };
      const routesB = { all: [{ route: '/api/users/123' }] };

      const result = getSharedRoutes(routesA, routesB);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should return array of strings', () => {
      const routesA = { all: [{ route: '/api/test' }] };
      const routesB = { all: [{ route: '/api/test' }] };

      const result = getSharedRoutes(routesA, routesB);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(route => {
        expect(typeof route).toBe('string');
      });
    });

    it('should return empty array when no shared routes', () => {
      const routesA = { all: [{ route: '/api/a' }] };
      const routesB = { all: [{ route: '/api/b' }] };

      const result = getSharedRoutes(routesA, routesB);

      expect(result).toEqual([]);
    });

    it('should handle empty arrays', () => {
      const result = getSharedRoutes({ all: [] }, { all: [] });

      expect(result).toEqual([]);
    });

    it('should handle null/undefined inputs', () => {
      expect(getSharedRoutes(null, { all: [] })).toEqual([]);
      expect(getSharedRoutes({ all: [] }, null)).toEqual([]);
    });
  });

  describe('Connection properties', () => {
    it('should include via property', () => {
      const fileResults = {
        'server.js': {
          routes: {
            server: [{ route: '/api/test', method: 'GET', line: 1, type: 'server' }],
            client: [],
            all: [{ route: '/api/test', line: 1, type: 'server', method: 'GET' }]
          }
        },
        'client.js': {
          routes: {
            server: [],
            client: [{ route: '/api/test', line: 1, type: 'client' }],
            all: [{ route: '/api/test', line: 1, type: 'client' }]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections[0].via).toBe('route');
    });

    it('should include reason property', () => {
      const fileResults = {
        'a.js': {
          routes: {
            server: [{ route: '/api/myendpoint', method: 'GET', line: 1, type: 'server' }],
            client: [],
            all: [{ route: '/api/myendpoint', line: 1, type: 'server', method: 'GET' }]
          }
        },
        'b.js': {
          routes: {
            server: [],
            client: [{ route: '/api/myendpoint', line: 1, type: 'client' }],
            all: [{ route: '/api/myendpoint', line: 1, type: 'client' }]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections[0].reason).toContain('/api/myendpoint');
    });

    it('should have detectedBy set to route-extractor', () => {
      const fileResults = {
        'a.js': {
          routes: {
            server: [{ route: '/api/test', method: 'GET', line: 1, type: 'server' }],
            client: [],
            all: [{ route: '/api/test', line: 1, type: 'server', method: 'GET' }]
          }
        },
        'b.js': {
          routes: {
            server: [],
            client: [{ route: '/api/test', line: 1, type: 'client' }],
            all: [{ route: '/api/test', line: 1, type: 'client' }]
          }
        }
      };

      const connections = detectRouteConnections(fileResults);

      expect(connections[0].detectedBy).toBe('route-extractor');
    });
  });
});

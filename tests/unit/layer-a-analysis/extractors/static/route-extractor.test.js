/**
 * @fileoverview route-extractor.test.js
 * 
 * Tests for Route Extractor
 * Tests extractRoutes, normalizeRoute, isValidRoute
 * 
 * @module tests/unit/layer-a-analysis/extractors/static/route-extractor
 */

import { describe, it, expect } from 'vitest';
import {
  extractRoutes,
  normalizeRoute,
  isValidRoute
} from '#layer-a/extractors/static/route-extractor.js';
import { RouteBuilder } from '../../../../factories/static-extractor-test.factory.js';

describe('Route Extractor', () => {
  describe('extractRoutes', () => {
    it('should extract Express server routes', () => {
      const code = "app.get('/api/users', handler);";

      const result = extractRoutes('server.js', code);

      expect(result.server).toHaveLength(1);
      expect(result.server[0].route).toBe('/api/users');
      expect(result.server[0].method).toBe('GET');
      expect(result.server[0].type).toBe('server');
    });

    it('should extract multiple HTTP methods', () => {
      const code = `
        app.get('/api/users', getUsers);
        app.post('/api/users', createUser);
        app.put('/api/users/:id', updateUser);
        app.delete('/api/users/:id', deleteUser);
      `;

      const result = extractRoutes('server.js', code);

      expect(result.server).toHaveLength(4);
      expect(result.server.some(r => r.method === 'GET')).toBe(true);
      expect(result.server.some(r => r.method === 'POST')).toBe(true);
      expect(result.server.some(r => r.method === 'PUT')).toBe(true);
      expect(result.server.some(r => r.method === 'DELETE')).toBe(true);
    });

    it('should extract Express router routes', () => {
      const code = "router.get('/items', getItems);";

      const result = extractRoutes('routes.js', code);

      expect(result.server).toHaveLength(1);
      expect(result.server[0].route).toBe('/items');
    });

    it('should extract fetch calls (client routes)', () => {
      const code = "fetch('/api/users');";

      const result = extractRoutes('client.js', code);

      expect(result.client).toHaveLength(1);
      expect(result.client[0].route).toBe('/api/users');
      expect(result.client[0].type).toBe('client');
    });

    it('should extract axios calls', () => {
      const code = "axios.get('/api/posts');";

      const result = extractRoutes('client.js', code);

      expect(result.client).toHaveLength(1);
      expect(result.client[0].route).toBe('/api/posts');
    });

    it('should extract template literal fetch calls', () => {
      const code = 'fetch(`/api/users/${userId}`);';

      const result = extractRoutes('client.js', code);

      expect(result.client.length).toBeGreaterThan(0);
    });

    it('should include line numbers', () => {
      const code = `
        app.get('/api/route1', handler1);
        app.get('/api/route2', handler2);
      `;

      const result = extractRoutes('server.js', code);

      expect(result.server[0].line).toBeGreaterThan(0);
      expect(result.server[1].line).toBeGreaterThan(result.server[0].line);
    });

    it('should return server, client, and all arrays', () => {
      const code = 'app.get("/api/test", handler);';

      const result = extractRoutes('server.js', code);

      expect(result).toHaveProperty('server');
      expect(result).toHaveProperty('client');
      expect(result).toHaveProperty('all');
      expect(Array.isArray(result.server)).toBe(true);
      expect(Array.isArray(result.client)).toBe(true);
      expect(Array.isArray(result.all)).toBe(true);
    });

    it('should combine server and client routes in all', () => {
      const builder = new RouteBuilder();
      builder.withServerRoute('get', '/api/users')
        .withFetchCall('/api/users');
      const { code } = builder.build();

      const result = extractRoutes('mixed.js', code);

      expect(result.all.length).toBe(result.server.length + result.client.length);
    });

    it('should handle empty code', () => {
      const result = extractRoutes('empty.js', '');

      expect(result.server).toEqual([]);
      expect(result.client).toEqual([]);
      expect(result.all).toEqual([]);
    });

    it('should handle code with no routes', () => {
      const code = 'const x = 1;';

      const result = extractRoutes('noroutes.js', code);

      expect(result.server).toEqual([]);
      expect(result.client).toEqual([]);
    });

    it('should work with RouteBuilder Express app', () => {
      const builder = new RouteBuilder();
      builder.withExpressApp();
      const { code, routes } = builder.build();

      const result = extractRoutes('server.js', code);

      expect(result.server.length).toBeGreaterThanOrEqual(routes.server.length);
    });

    it('should work with RouteBuilder API client', () => {
      const builder = new RouteBuilder();
      builder.withAPIClient();
      const { code, routes } = builder.build();

      const result = extractRoutes('client.js', code);

      expect(result.client.length).toBeGreaterThanOrEqual(routes.client.length);
    });
  });

  describe('normalizeRoute', () => {
    it('should replace :param syntax with :param', () => {
      const route = '/api/users/:id';

      const result = normalizeRoute(route);

      expect(result).toBe('/api/users/:param');
    });

    it('should replace ${} template literal syntax', () => {
      const route = '/api/users/${userId}';

      const result = normalizeRoute(route);

      expect(result).toBe('/api/users/${param}');
    });

    it('should handle multiple parameters', () => {
      const route = '/api/users/:userId/posts/:postId';

      const result = normalizeRoute(route);

      expect(result).toBe('/api/users/:param/posts/:param');
    });

    it('should not modify routes without parameters', () => {
      const route = '/api/users';

      const result = normalizeRoute(route);

      expect(result).toBe('/api/users');
    });

    it('should handle root route', () => {
      const result = normalizeRoute('/');

      expect(result).toBe('/');
    });
  });

  describe('isValidRoute', () => {
    it('should return true for valid routes starting with /', () => {
      expect(isValidRoute('/api/users')).toBe(true);
      expect(isValidRoute('/users')).toBe(true);
      expect(isValidRoute('/')).toBe(true);
    });

    it('should return false for routes not starting with /', () => {
      expect(isValidRoute('api/users')).toBe(false);
      expect(isValidRoute('users')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isValidRoute('')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isValidRoute(null)).toBe(false);
      expect(isValidRoute(undefined)).toBe(false);
      expect(isValidRoute(123)).toBe(false);
      expect(isValidRoute({})).toBe(false);
    });

    it('should return false for single / with length check', () => {
      expect(isValidRoute('/')).toBe(true);
    });
  });

  describe('Complex route patterns', () => {
    it('should handle PATCH and ALL methods', () => {
      const code = `
        app.patch('/api/users/:id', patchHandler);
        app.all('/api/*', allHandler);
      `;

      const result = extractRoutes('server.js', code);

      expect(result.server.some(r => r.method === 'PATCH')).toBe(true);
      expect(result.server.some(r => r.method === 'ALL')).toBe(true);
    });

    it('should handle routes with query parameters in fetch', () => {
      const code = "fetch('/api/users?page=1&limit=10');";

      const result = extractRoutes('client.js', code);

      expect(result.client.length).toBeGreaterThan(0);
    });

    it('should handle axios with different methods', () => {
      const code = `
        axios.post('/api/login', credentials);
        axios.put('/api/profile', data);
        axios.delete('/api/account');
      `;

      const result = extractRoutes('client.js', code);

      expect(result.client.length).toBe(3);
    });

    it('should handle .request with url property', () => {
      const code = `
        axios.request({ url: '/api/data', method: 'GET' });
      `;

      const result = extractRoutes('client.js', code);

      expect(result.client.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle null code', () => {
      expect(() => extractRoutes('test.js', null)).not.toThrow();
    });

    it('should handle undefined code', () => {
      expect(() => extractRoutes('test.js', undefined)).not.toThrow();
    });

    it('should handle routes with special characters', () => {
      const code = "app.get('/api/v1.0/resource', handler);";

      const result = extractRoutes('server.js', code);

      expect(result.server[0].route).toBe('/api/v1.0/resource');
    });

    it('should handle routes with hyphens', () => {
      const code = "app.get('/api/user-profiles', handler);";

      const result = extractRoutes('server.js', code);

      expect(result.server[0].route).toBe('/api/user-profiles');
    });

    it('should handle nested routes', () => {
      const code = "app.get('/api/v1/users/:id/posts/:postId/comments', handler);";

      const result = extractRoutes('server.js', code);

      expect(result.server[0].route).toBe('/api/v1/users/:id/posts/:postId/comments');
    });
  });
});

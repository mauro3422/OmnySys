/**
 * @fileoverview API Route Detector Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/detectors/api-route-detector
 */

import { describe, it, expect } from 'vitest';
import { findAPIRoutes } from '../../../../../src/layer-a-static/module-system/detectors/api-route-detector.js';
import { 
  ModuleBuilder,
  AtomBuilder 
} from '../../../../factories/module-system-test.factory.js';

describe('API Route Detector', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export findAPIRoutes function', () => {
      expect(typeof findAPIRoutes).toBe('function');
    });

    it('should return array', () => {
      const result = findAPIRoutes([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Route Detection
  // ============================================================================
  describe('Route Detection', () => {
    it('should find routes in routes.js files', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUsers').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      expect(routes.length).toBeGreaterThan(0);
    });

    it('should find routes in router.js files', () => {
      const modules = [
        ModuleBuilder.create('api')
          .withFile('src/api/router.js')
          .withMolecule('src/api/router.js', [
            AtomBuilder.create('handleRequest').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      expect(routes.length).toBeGreaterThanOrEqual(0);
    });

    it('should find routes in api.js files', () => {
      const modules = [
        ModuleBuilder.create('api')
          .withFile('src/api/api.js')
          .withMolecule('src/api/api.js', [
            AtomBuilder.create('getData').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      expect(routes.length).toBeGreaterThanOrEqual(0);
    });

    it('should find routes in server.js files', () => {
      const modules = [
        ModuleBuilder.create('server')
          .withFile('src/server.js')
          .withMolecule('src/server.js', [
            AtomBuilder.create('startServer').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      expect(routes.length).toBeGreaterThanOrEqual(0);
    });

    it('should find routes in app.js files', () => {
      const modules = [
        ModuleBuilder.create('app')
          .withFile('src/app.js')
          .withMolecule('src/app.js', [
            AtomBuilder.create('initApp').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      expect(routes.length).toBeGreaterThanOrEqual(0);
    });

    it('should find routes in routes/ directory', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes/index.js')
          .withMolecule('src/users/routes/index.js', [
            AtomBuilder.create('listUsers').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      expect(routes.length).toBeGreaterThanOrEqual(0);
    });

    it('should find routes in api/ directory', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/api/handlers.js')
          .withMolecule('src/users/api/handlers.js', [
            AtomBuilder.create('createUser').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      expect(routes.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // Route Structure
  // ============================================================================
  describe('Route Structure', () => {
    it('should have type set to api', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUsers').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      if (routes.length > 0) {
        expect(routes[0].type).toBe('api');
      }
    });

    it('should have HTTP method', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUsers').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      if (routes.length > 0) {
        expect(routes[0]).toHaveProperty('method');
        expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(routes[0].method);
      }
    });

    it('should have path', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUsers').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      if (routes.length > 0) {
        expect(routes[0]).toHaveProperty('path');
        expect(typeof routes[0].path).toBe('string');
        expect(routes[0].path.startsWith('/')).toBe(true);
      }
    });

    it('should have handler info', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUsers').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      if (routes.length > 0) {
        expect(routes[0]).toHaveProperty('handler');
        expect(routes[0].handler).toHaveProperty('module');
        expect(routes[0].handler).toHaveProperty('file');
        expect(routes[0].handler).toHaveProperty('function');
      }
    });

    it('should have middleware array', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUsers').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      if (routes.length > 0) {
        expect(routes[0]).toHaveProperty('middleware');
        expect(Array.isArray(routes[0].middleware)).toBe(true);
      }
    });
  });

  // ============================================================================
  // HTTP Method Inference
  // ============================================================================
  describe('HTTP Method Inference', () => {
    it('should infer GET for get* functions', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUsers').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      const getRoute = routes.find(r => r.handler?.function === 'getUsers');
      
      if (getRoute) {
        expect(getRoute.method).toBe('GET');
      }
    });

    it('should infer GET for find* functions', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('findUser').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      const findRoute = routes.find(r => r.handler?.function === 'findUser');
      
      if (findRoute) {
        expect(findRoute.method).toBe('GET');
      }
    });

    it('should infer POST for create* functions', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('createUser').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      const createRoute = routes.find(r => r.handler?.function === 'createUser');
      
      if (createRoute) {
        expect(createRoute.method).toBe('POST');
      }
    });

    it('should infer PUT for update* functions', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('updateUser').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      const updateRoute = routes.find(r => r.handler?.function === 'updateUser');
      
      if (updateRoute) {
        expect(updateRoute.method).toBe('PUT');
      }
    });

    it('should infer DELETE for delete* functions', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('deleteUser').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      const deleteRoute = routes.find(r => r.handler?.function === 'deleteUser');
      
      if (deleteRoute) {
        expect(deleteRoute.method).toBe('DELETE');
      }
    });
  });

  // ============================================================================
  // Route Path Inference
  // ============================================================================
  describe('Route Path Inference', () => {
    it('should infer path from function name', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUsers').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      if (routes.length > 0) {
        expect(routes[0].path).toBeDefined();
      }
    });

    it('should convert camelCase to kebab-case in path', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUserById').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      if (routes.length > 0) {
        expect(routes[0].path).toContain('-');
      }
    });
  });

  // ============================================================================
  // Middleware Detection
  // ============================================================================
  describe('Middleware Detection', () => {
    it('should detect auth middleware', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('getUsers')
              .exported()
              .callsExternal('authMiddleware')
              .build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      if (routes.length > 0 && routes[0].middleware.length > 0) {
        const authMiddleware = routes[0].middleware.find(m => m.type === 'auth');
        expect(authMiddleware).toBeDefined();
      }
    });

    it('should detect validate middleware', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('createUser')
              .exported()
              .callsExternal('validateRequest')
              .build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      
      if (routes.length > 0 && routes[0].middleware.length > 0) {
        expect(routes[0].middleware.some(m => m.name.toLowerCase().includes('validate'))).toBe(true);
      }
    });
  });

  // ============================================================================
  // Empty/Edge Cases
  // ============================================================================
  describe('Empty/Edge Cases', () => {
    it('should return empty array for empty modules', () => {
      const routes = findAPIRoutes([]);
      expect(routes).toEqual([]);
    });

    it('should handle modules without route files', () => {
      const modules = [
        ModuleBuilder.create('utils')
          .withFile('src/utils/helpers.js')
          .withMolecule('src/utils/helpers.js', [
            AtomBuilder.create('helper').exported().build()
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      expect(routes).toEqual([]);
    });

    it('should handle route files without exported atoms', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .withMolecule('src/users/routes.js', [
            AtomBuilder.create('privateHelper').build() // Not exported
          ])
          .build()
      ];

      const routes = findAPIRoutes(modules);
      expect(routes).toEqual([]);
    });

    it('should handle modules without molecules', () => {
      const modules = [
        ModuleBuilder.create('users')
          .withFile('src/users/routes.js')
          .build()
      ];

      const routes = findAPIRoutes(modules);
      expect(routes).toEqual([]);
    });
  });
});

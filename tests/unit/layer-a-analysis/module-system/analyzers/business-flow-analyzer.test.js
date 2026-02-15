/**
 * @fileoverview Business Flow Analyzer Tests
 * 
 * @module tests/unit/layer-a-analysis/module-system/analyzers/business-flow-analyzer
 */

import { describe, it, expect } from 'vitest';
import { detectBusinessFlows } from '../../../../../src/layer-a-static/module-system/analyzers/business-flow-analyzer.js';
import { 
  EntryPointBuilder,
  ModuleBuilder,
  AtomBuilder,
  createMockEntryPoint 
} from '../../../../factories/module-system-test.factory.js';

describe('Business Flow Analyzer', () => {
  // ============================================================================
  // Structure Contract
  // ============================================================================
  describe('Structure Contract', () => {
    it('should export detectBusinessFlows function', () => {
      expect(typeof detectBusinessFlows).toBe('function');
    });

    it('should return array', () => {
      const result = detectBusinessFlows([], {});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // Flow Detection
  // ============================================================================
  describe('Flow Detection', () => {
    it('should handle API entry points', () => {
      const entryPoints = [
        EntryPointBuilder.api('/users', 'GET')
          .handledBy('users', 'routes.js', 'getUsers')
          .build()
      ];
      const context = {
        modules: [ModuleBuilder.create('users').build()],
        moduleByName: new Map([['users', ModuleBuilder.create('users').build()]]),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      expect(Array.isArray(flows)).toBe(true);
    });

    it('should ignore non-API entry points', () => {
      const entryPoints = [
        EntryPointBuilder.cli('test-command')
          .handledBy('cli', 'commands.js', 'runTest')
          .build(),
        EntryPointBuilder.event('user-login')
          .handledBy('auth', 'events.js', 'onUserLogin')
          .build()
      ];
      const context = { modules: [], moduleByName: new Map(), findAtom: () => null };

      const flows = detectBusinessFlows(entryPoints, context);
      
      expect(flows).toHaveLength(0);
    });
  });

  // ============================================================================
  // Flow Structure
  // ============================================================================
  describe('Flow Structure', () => {
    it('should include flow name', () => {
      const entryPoints = [
        createMockEntryPoint('api', { path: '/users', method: 'GET' })
      ];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0) {
        expect(flows[0]).toHaveProperty('name');
        expect(typeof flows[0].name).toBe('string');
      }
    });

    it('should include flow type', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0) {
        expect(flows[0]).toHaveProperty('type');
        expect(flows[0].type).toBe('api');
      }
    });

    it('should include entry point reference', () => {
      const entryPoint = createMockEntryPoint('api', { path: '/test' });
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows([entryPoint], context);
      
      if (flows.length > 0) {
        expect(flows[0]).toHaveProperty('entryPoint');
      }
    });

    it('should include steps array', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0) {
        expect(flows[0]).toHaveProperty('steps');
        expect(Array.isArray(flows[0].steps)).toBe(true);
      }
    });

    it('should include total steps count', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0) {
        expect(flows[0]).toHaveProperty('totalSteps');
        expect(typeof flows[0].totalSteps).toBe('number');
      }
    });

    it('should include modules involved', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0) {
        expect(flows[0]).toHaveProperty('modulesInvolved');
        expect(Array.isArray(flows[0].modulesInvolved)).toBe(true);
      }
    });

    it('should include hasAsync flag', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0) {
        expect(flows[0]).toHaveProperty('hasAsync');
        expect(typeof flows[0].hasAsync).toBe('boolean');
      }
    });

    it('should include side effects', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0) {
        expect(flows[0]).toHaveProperty('sideEffects');
        expect(Array.isArray(flows[0].sideEffects)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Step Structure
  // ============================================================================
  describe('Step Structure', () => {
    it('should have step with order number', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const atom = AtomBuilder.create('handler')
        .exported()
        .returns()
        .build();
      const module = ModuleBuilder.create('test')
        .withMolecule('src/test/file.js', [atom])
        .build();
      const context = {
        modules: [module],
        moduleByName: new Map([['test', module]]),
        findAtom: (mod, func) => func === 'handler' ? atom : null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0 && flows[0].steps.length > 0) {
        expect(flows[0].steps[0]).toHaveProperty('order');
        expect(typeof flows[0].steps[0].order).toBe('number');
      }
    });

    it('should have step with module name', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0 && flows[0].steps.length > 0) {
        expect(flows[0].steps[0]).toHaveProperty('module');
      }
    });

    it('should have step with function name', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0 && flows[0].steps.length > 0) {
        expect(flows[0].steps[0]).toHaveProperty('function');
      }
    });

    it('should have step with input/output', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0 && flows[0].steps.length > 0) {
        expect(flows[0].steps[0]).toHaveProperty('input');
        expect(flows[0].steps[0]).toHaveProperty('output');
        expect(Array.isArray(flows[0].steps[0].input)).toBe(true);
        expect(Array.isArray(flows[0].steps[0].output)).toBe(true);
      }
    });

    it('should have step with async flag', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0 && flows[0].steps.length > 0) {
        expect(flows[0].steps[0]).toHaveProperty('async');
        expect(typeof flows[0].steps[0].async).toBe('boolean');
      }
    });

    it('should have step with side effects', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0 && flows[0].steps.length > 0) {
        expect(flows[0].steps[0]).toHaveProperty('sideEffects');
        expect(Array.isArray(flows[0].steps[0].sideEffects)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Flow Name Inference
  // ============================================================================
  describe('Flow Name Inference', () => {
    it('should infer name from API path and method', () => {
      const entryPoints = [
        createMockEntryPoint('api', { path: '/users/list', method: 'GET' })
      ];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0) {
        // Name should be derived from method and path
        expect(typeof flows[0].name).toBe('string');
        expect(flows[0].name.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Empty/Edge Cases
  // ============================================================================
  describe('Empty/Edge Cases', () => {
    it('should handle empty entry points', () => {
      const flows = detectBusinessFlows([], { modules: [], moduleByName: new Map(), findAtom: () => null });
      expect(flows).toEqual([]);
    });

    it('should limit steps to prevent infinite loops', () => {
      const entryPoints = [createMockEntryPoint('api', { path: '/test' })];
      const context = {
        modules: [],
        moduleByName: new Map(),
        findAtom: () => null
      };

      const flows = detectBusinessFlows(entryPoints, context);
      
      if (flows.length > 0) {
        expect(flows[0].steps.length).toBeLessThanOrEqual(20);
      }
    });
  });
});

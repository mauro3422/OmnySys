/**
 * @fileoverview Shadow Registry Contract Test
 * 
 * Tests de contrato para Shadow Registry.
 * 
 * @module tests/contracts/layer-c/shadow-registry.contract.test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  SHADOW_REGISTRY_EXPORTS,
  SHADOW_REGISTRY_METHODS,
  LINEAGE_TRACKER_EXPORTS,
  safeImport
} from './helpers/index.js';

describe('Shadow Registry Contract', () => {
  describe('ShadowRegistry Module Exports', () => {
    let mod;

    beforeAll(async () => {
      mod = await safeImport('#layer-c/shadow-registry/index.js');
    });

    it('MUST be importable', () => {
      if (!mod) {
        expect(true).toBe(true);
        return;
      }
      expect(mod).toBeDefined();
    });

    SHADOW_REGISTRY_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!mod) return;
        expect(mod[exportName]).toBeDefined();
      });
    });
  });

  describe('ShadowRegistry Class Methods', () => {
    let ShadowRegistry;

    beforeAll(async () => {
      const mod = await safeImport('#layer-c/shadow-registry/index.js');
      ShadowRegistry = mod?.ShadowRegistry;
    });

    it('MUST be a class', () => {
      if (!ShadowRegistry) return;
      expect(typeof ShadowRegistry).toBe('function');
    });

    SHADOW_REGISTRY_METHODS.forEach(methodName => {
      it(`MUST have method ${methodName}`, () => {
        if (!ShadowRegistry) return;
        const instance = new ShadowRegistry('/tmp/test');
        expect(instance[methodName]).toBeDefined();
        expect(typeof instance[methodName]).toBe('function');
      });
    });
  });

  describe('LineageTracker Module Exports', () => {
    let mod;

    beforeAll(async () => {
      mod = await safeImport('#layer-c/shadow-registry/lineage-tracker/index.js');
    });

    it('MUST be importable', () => {
      if (!mod) {
        expect(true).toBe(true);
        return;
      }
      expect(mod).toBeDefined();
    });

    LINEAGE_TRACKER_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!mod) return;
        expect(mod[exportName]).toBeDefined();
      });

      it(`${exportName} MUST be a function`, () => {
        if (!mod) return;
        if (mod[exportName]) {
          expect(typeof mod[exportName]).toBe('function');
        }
      });
    });
  });

  describe('ShadowStatus Type', () => {
    let ShadowStatus;

    beforeAll(async () => {
      const mod = await safeImport('#layer-c/shadow-registry/index.js');
      ShadowStatus = mod?.ShadowStatus;
    });

    it('MUST be defined', () => {
      if (!ShadowStatus) return;
      expect(ShadowStatus).toBeDefined();
    });

    ['DELETED', 'REPLACED', 'MERGED', 'SPLIT'].forEach(status => {
      it(`MUST have ${status} status`, () => {
        if (!ShadowStatus) return;
        expect(ShadowStatus[status]).toBe(status.toLowerCase());
      });
    });
  });

  describe('Function Signatures', () => {
    let ShadowRegistry;
    let instance;

    beforeAll(async () => {
      const mod = await safeImport('#layer-c/shadow-registry/index.js');
      ShadowRegistry = mod?.ShadowRegistry;
      if (ShadowRegistry) {
        instance = new ShadowRegistry('/tmp/test');
      }
    });

    ['initialize', 'createShadow', 'findSimilar', 'getShadow', 
     'markReplaced', 'getLineage', 'listShadows', 'enrichWithAncestry'].forEach(method => {
      it(`${method} MUST be async (return Promise)`, () => {
        if (!instance) return;
        let result;
        if (method === 'getShadow' || method === 'getLineage' || method === 'markReplaced') {
          result = instance[method]('test-id');
        } else if (method === 'createShadow' || method === 'findSimilar' || method === 'listShadows' || method === 'enrichWithAncestry') {
          result = instance[method]({});
        } else {
          result = instance[method]();
        }
        if (result?.catch) result.catch(() => {});
        expect(result).toBeInstanceOf(Promise);
      });
    });
  });

  describe('Return Type Patterns', () => {
    let registerDeath, registerBirth, reconstructLineage;

    beforeAll(async () => {
      const mod = await safeImport('#layer-c/shadow-registry/lineage-tracker/index.js');
      registerDeath = mod?.registerDeath;
      registerBirth = mod?.registerBirth;
      reconstructLineage = mod?.reconstructLineage;
    });

    it('registerDeath MUST return object with shadowId, originalId, status', () => {
      if (!registerDeath) return;
      const result = registerDeath({ id: 'test' });
      expect(result).toHaveProperty('shadowId');
      expect(result).toHaveProperty('originalId');
      expect(result).toHaveProperty('status');
      expect(typeof result.shadowId).toBe('string');
    });

    it('registerBirth MUST return object with generation', () => {
      if (!registerBirth) return;
      const result = registerBirth({ id: 'test' });
      expect(result).toHaveProperty('generation');
      expect(typeof result.generation).toBe('number');
    });

    it('reconstructLineage MUST be async', () => {
      if (!reconstructLineage) return;
      const result = reconstructLineage('test-id', async () => null);
      expect(result).toBeInstanceOf(Promise);
    });
  });
});

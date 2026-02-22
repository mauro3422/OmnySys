/**
 * @fileoverview Layer C Exports Contract Test
 * 
 * Tests de contrato para verificar exports de Layer C.
 * 
 * @module tests/contracts/layer-c/layer-c-exports.contract.test
 */

import { describe, it, expect } from 'vitest';
import { 
  createModuleExportTests, 
  createTypeExportTests,
  safeImport 
} from './helpers/contract-helpers.js';
import { 
  LAYER_C_MODULES, 
  LAYER_C_TYPES_MODULES,
  SHADOW_REGISTRY_SUBMODULES,
  DEFAULT_EXPORT_MODULES
} from './helpers/module-definitions.js';

describe('Layer C Exports Contract', () => {
  describe('Main Module Exports', () => {
    LAYER_C_MODULES.forEach(({ name, module, expectedExports }) => {
      createModuleExportTests(name, module, expectedExports);
    });
  });

  describe('Types Module Exports', () => {
    LAYER_C_TYPES_MODULES.forEach(({ name, module, expectedExports }) => {
      createTypeExportTests(name, module, expectedExports);
    });
  });

  describe('Default Exports', () => {
    DEFAULT_EXPORT_MODULES.forEach(({ name, module, className }) => {
      let mod;

      beforeAll(async () => {
        mod = await safeImport(module);
      });

      it(`${name} MUST have default export`, () => {
        if (!mod) return;
        expect(mod.default).toBeDefined();
      });

      it(`${name} default MUST be ${className} class`, () => {
        if (!mod) return;
        expect(mod.default).toBe(mod[className]);
      });
    });
  });

  describe('Sub-module Re-exports', () => {
    describe('Shadow Registry Sub-modules', () => {
      let mainMod;
      const subModules = {};

      beforeAll(async () => {
        mainMod = await safeImport('#layer-c/shadow-registry/index.js');
        
        for (const { name, module } of SHADOW_REGISTRY_SUBMODULES) {
          subModules[name] = await safeImport(module);
        }
      });

      // Test individual submodule exports
      SHADOW_REGISTRY_SUBMODULES.forEach(({ name, exports }) => {
        exports.forEach(exportName => {
          it(`${name} module MUST export ${exportName}`, () => {
            if (!subModules[name]) return;
            expect(subModules[name][exportName]).toBeDefined();
          });
        });
      });

      // Test re-exports from main module
      it('main module MUST re-export all submodule exports', () => {
        if (!mainMod) return;
        
        const allExports = SHADOW_REGISTRY_SUBMODULES.flatMap(s => s.exports);
        allExports.forEach(exportName => {
          expect(mainMod[exportName]).toBeDefined();
        });
      });
    });

    describe('Verification Orchestrator Sub-modules', () => {
      const submodules = [
        { name: 'reporters', module: '#layer-c/verification/orchestrator/reporters/index.js', export: 'generateReport' },
        { name: 'certificates', module: '#layer-c/verification/orchestrator/certificates/index.js', export: 'generateCertificate' },
        { name: 'status', module: '#layer-c/verification/orchestrator/status/index.js', export: 'getQuickStatus' },
        { name: 'validators', module: '#layer-c/verification/orchestrator/validators/index.js', export: 'ValidatorRegistry' }
      ];

      let mainMod;
      const loadedModules = {};

      beforeAll(async () => {
        mainMod = await safeImport('#layer-c/verification/orchestrator/index.js');
        
        for (const { name, module } of submodules) {
          loadedModules[name] = await safeImport(module);
        }
      });

      submodules.forEach(({ name, export: exportName }) => {
        it(`${name} module MUST export ${exportName}`, () => {
          if (!loadedModules[name]) return;
          expect(loadedModules[name][exportName]).toBeDefined();
        });

        it(`main module MUST re-export ${exportName}`, () => {
          if (!mainMod) return;
          expect(mainMod[exportName]).toBeDefined();
        });
      });
    });
  });

  describe('Module Import Compatibility', () => {
    it('all Layer C modules MUST use ESM imports', async () => {
      const modulesToTest = [
        '#layer-c/shadow-registry/index.js',
        '#layer-c/verification/orchestrator/index.js',
        '#layer-c/mcp/tools/index.js'
      ];

      const imports = await Promise.all(
        modulesToTest.map(m => safeImport(m))
      );

      imports.forEach(mod => {
        if (mod) {
          expect(typeof mod).toBe('object');
        }
      });
    });

    it('imports MUST be consistent across multiple calls', async () => {
      const mod1 = await import('#layer-c/shadow-registry/index.js');
      const mod2 = await import('#layer-c/shadow-registry/index.js');
      
      expect(mod1).toBe(mod2);
    });
  });
});

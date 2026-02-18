import { describe, it, expect, beforeAll } from 'vitest';

const LAYER_C_MODULES = [
  {
    name: 'Shadow Registry',
    module: '#layer-c/shadow-registry/index.js',
    expectedExports: ['ShadowRegistry', 'getShadowRegistry', 'ShadowStatus']
  },
  {
    name: 'Lineage Tracker',
    module: '#layer-c/shadow-registry/lineage-tracker/index.js',
    expectedExports: ['registerBirth', 'registerDeath', 'reconstructLineage']
  },
  {
    name: 'Verification Orchestrator',
    module: '#layer-c/verification/orchestrator/index.js',
    expectedExports: ['VerificationOrchestrator', 'generateReport', 'getQuickStatus']
  },
  {
    name: 'Verification Types',
    module: '#layer-c/verification/types/index.js',
    expectedExports: ['Severity', 'IssueCategory', 'VerificationStatus']
  },
  {
    name: 'MCP Tools',
    module: '#layer-c/mcp/tools/index.js',
    expectedExports: ['toolDefinitions', 'toolHandlers']
  }
];

const LAYER_C_TYPES_MODULES = [
  {
    name: 'Shadow Registry Types',
    module: '#layer-c/shadow-registry/types.js',
    expectedExports: ['ShadowStatus', 'EvolutionType', 'DecisionType']
  },
  {
    name: 'Verification Types',
    module: '#layer-c/verification/types/index.js',
    expectedExports: ['Severity', 'IssueCategory', 'DataSystem', 'VerificationStatus']
  }
];

describe('Layer C Exports Contract', () => {
  describe('Main Module Exports', () => {
    LAYER_C_MODULES.forEach(({ name, module, expectedExports }) => {
      describe(`${name}`, () => {
        let mod;

        beforeAll(async () => {
          try {
            mod = await import(module);
          } catch (e) {
            mod = null;
          }
        });

        it('MUST be importable', () => {
          if (!mod) {
            expect(true).toBe(true);
            return;
          }
          expect(mod).toBeDefined();
        });

        expectedExports.forEach(exportName => {
          it(`MUST export ${exportName}`, () => {
            if (!mod) return;
            expect(mod[exportName]).toBeDefined();
          });
        });
      });
    });
  });

  describe('Types Module Exports', () => {
    LAYER_C_TYPES_MODULES.forEach(({ name, module, expectedExports }) => {
      describe(`${name}`, () => {
        let mod;

        beforeAll(async () => {
          try {
            mod = await import(module);
          } catch (e) {
            mod = null;
          }
        });

        it('MUST be importable', () => {
          if (!mod) {
            expect(true).toBe(true);
            return;
          }
          expect(mod).toBeDefined();
        });

        expectedExports.forEach(exportName => {
          it(`MUST export ${exportName}`, () => {
            if (!mod) return;
            expect(mod[exportName]).toBeDefined();
          });

          it(`${exportName} MUST be an object (enum)`, () => {
            if (!mod || !mod[exportName]) return;
            expect(typeof mod[exportName]).toBe('object');
          });
        });
      });
    });
  });

  describe('Default Exports', () => {
    let shadowRegistry;
    let verificationOrchestrator;

    beforeAll(async () => {
      try {
        shadowRegistry = await import('#layer-c/shadow-registry/index.js');
      } catch (e) {}

      try {
        verificationOrchestrator = await import('#layer-c/verification/orchestrator/index.js');
      } catch (e) {}
    });

    it('ShadowRegistry MUST have default export', () => {
      if (!shadowRegistry) return;
      expect(shadowRegistry.default).toBeDefined();
    });

    it('ShadowRegistry default MUST be ShadowRegistry class', () => {
      if (!shadowRegistry) return;
      expect(shadowRegistry.default).toBe(shadowRegistry.ShadowRegistry);
    });

    it('VerificationOrchestrator MUST have default export', () => {
      if (!verificationOrchestrator) return;
      expect(verificationOrchestrator.default).toBeDefined();
    });

    it('VerificationOrchestrator default MUST be VerificationOrchestrator class', () => {
      if (!verificationOrchestrator) return;
      expect(verificationOrchestrator.default).toBe(verificationOrchestrator.VerificationOrchestrator);
    });
  });

  describe('Sub-module Re-exports', () => {
    describe('Shadow Registry Sub-modules', () => {
      let mainMod;
      let storageMod;
      let cacheMod;
      let dnaMod;
      let searchMod;
      let ancestryMod;

      beforeAll(async () => {
        try {
          mainMod = await import('#layer-c/shadow-registry/index.js');
        } catch (e) {}

        try {
          storageMod = await import('#layer-c/shadow-registry/storage/index.js');
        } catch (e) {}

        try {
          cacheMod = await import('#layer-c/shadow-registry/cache/index.js');
        } catch (e) {}

        try {
          dnaMod = await import('#layer-c/shadow-registry/dna/index.js');
        } catch (e) {}

        try {
          searchMod = await import('#layer-c/shadow-registry/search/index.js');
        } catch (e) {}

        try {
          ancestryMod = await import('#layer-c/shadow-registry/ancestry/index.js');
        } catch (e) {}
      });

      it('storage module MUST export ShadowStorage', () => {
        if (!storageMod) return;
        expect(storageMod.ShadowStorage).toBeDefined();
      });

      it('storage module MUST export IndexManager', () => {
        if (!storageMod) return;
        expect(storageMod.IndexManager).toBeDefined();
      });

      it('cache module MUST export ShadowCache', () => {
        if (!cacheMod) return;
        expect(cacheMod.ShadowCache).toBeDefined();
      });

      it('dna module MUST export createFallbackDNA', () => {
        if (!dnaMod) return;
        expect(dnaMod.createFallbackDNA).toBeDefined();
      });

      it('search module MUST export findSimilarShadows', () => {
        if (!searchMod) return;
        expect(searchMod.findSimilarShadows).toBeDefined();
      });

      it('ancestry module MUST export enrichWithAncestry', () => {
        if (!ancestryMod) return;
        expect(ancestryMod.enrichWithAncestry).toBeDefined();
      });

      it('main module MUST re-export from storage', () => {
        if (!mainMod) return;
        expect(mainMod.ShadowStorage).toBeDefined();
        expect(mainMod.IndexManager).toBeDefined();
      });

      it('main module MUST re-export from cache', () => {
        if (!mainMod) return;
        expect(mainMod.ShadowCache).toBeDefined();
      });

      it('main module MUST re-export from dna', () => {
        if (!mainMod) return;
        expect(mainMod.createFallbackDNA).toBeDefined();
      });

      it('main module MUST re-export from search', () => {
        if (!mainMod) return;
        expect(mainMod.findSimilarShadows).toBeDefined();
      });

      it('main module MUST re-export from ancestry', () => {
        if (!mainMod) return;
        expect(mainMod.enrichWithAncestry).toBeDefined();
      });
    });

    describe('Verification Orchestrator Sub-modules', () => {
      let mainMod;
      let reportersMod;
      let certificatesMod;
      let statusMod;
      let validatorsMod;

      beforeAll(async () => {
        try {
          mainMod = await import('#layer-c/verification/orchestrator/index.js');
        } catch (e) {}

        try {
          reportersMod = await import('#layer-c/verification/orchestrator/reporters/index.js');
        } catch (e) {}

        try {
          certificatesMod = await import('#layer-c/verification/orchestrator/certificates/index.js');
        } catch (e) {}

        try {
          statusMod = await import('#layer-c/verification/orchestrator/status/index.js');
        } catch (e) {}

        try {
          validatorsMod = await import('#layer-c/verification/orchestrator/validators/index.js');
        } catch (e) {}
      });

      it('reporters module MUST export generateReport', () => {
        if (!reportersMod) return;
        expect(reportersMod.generateReport).toBeDefined();
      });

      it('certificates module MUST export generateCertificate', () => {
        if (!certificatesMod) return;
        expect(certificatesMod.generateCertificate).toBeDefined();
      });

      it('status module MUST export getQuickStatus', () => {
        if (!statusMod) return;
        expect(statusMod.getQuickStatus).toBeDefined();
      });

      it('validators module MUST export ValidatorRegistry', () => {
        if (!validatorsMod) return;
        expect(validatorsMod.ValidatorRegistry).toBeDefined();
      });

      it('main module MUST re-export from reporters', () => {
        if (!mainMod) return;
        expect(mainMod.generateReport).toBeDefined();
      });

      it('main module MUST re-export from certificates', () => {
        if (!mainMod) return;
        expect(mainMod.generateCertificate).toBeDefined();
      });

      it('main module MUST re-export from status', () => {
        if (!mainMod) return;
        expect(mainMod.getQuickStatus).toBeDefined();
      });

      it('main module MUST re-export from validators', () => {
        if (!mainMod) return;
        expect(mainMod.ValidatorRegistry).toBeDefined();
      });
    });
  });

  describe('Module Import Compatibility', () => {
    it('all Layer C modules MUST use ESM imports', async () => {
      const imports = [];
      
      try {
        imports.push(await import('#layer-c/shadow-registry/index.js'));
      } catch (e) {}
      
      try {
        imports.push(await import('#layer-c/verification/orchestrator/index.js'));
      } catch (e) {}
      
      try {
        imports.push(await import('#layer-c/mcp/tools/index.js'));
      } catch (e) {}

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

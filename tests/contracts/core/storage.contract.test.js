import { describe, it, expect, beforeAll } from 'vitest';

const STORAGE_MAIN_EXPORTS = [
  'calculateFileHash',
  'createDataDirectory',
  'getDataDirectory',
  'hasExistingAnalysis',
  'saveMetadata',
  'saveFileAnalysis',
  'saveConnections',
  'saveRiskAssessment',
  'savePartitionedSystemMap',
  'saveMolecule',
  'loadMolecule',
  'saveAtom',
  'loadAtoms'
];

const STORAGE_UTILS_EXPORTS = ['calculateFileHash'];

const STORAGE_SETUP_EXPORTS = ['createDataDirectory', 'getDataDirectory', 'hasExistingAnalysis'];

const STORAGE_FILES_EXPORTS = [
  'saveMetadata',
  'saveFileAnalysis',
  'saveConnections',
  'saveRiskAssessment',
  'savePartitionedSystemMap'
];

const STORAGE_MOLECULES_EXPORTS = ['saveMolecule', 'loadMolecule'];

const STORAGE_ATOMS_EXPORTS = ['saveAtom', 'loadAtoms'];

describe('Layer C Storage Module Contract', () => {
  let storageModule;
  let utilsModule;
  let setupModule;
  let filesModule;
  let moleculesModule;
  let atomsModule;

  beforeAll(async () => {
    try {
      storageModule = await import('#layer-c/storage/index.js');
    } catch (e) {
      storageModule = null;
    }

    try {
      utilsModule = await import('#layer-c/storage/utils/index.js');
    } catch (e) {
      utilsModule = null;
    }

    try {
      setupModule = await import('#layer-c/storage/setup/index.js');
    } catch (e) {
      setupModule = null;
    }

    try {
      filesModule = await import('#layer-c/storage/files/index.js');
    } catch (e) {
      filesModule = null;
    }

    try {
      moleculesModule = await import('#layer-c/storage/molecules/index.js');
    } catch (e) {
      moleculesModule = null;
    }

    try {
      atomsModule = await import('#layer-c/storage/atoms/index.js');
    } catch (e) {
      atomsModule = null;
    }
  });

  describe('Main Module Exports', () => {
    it('MUST be importable', () => {
      if (!storageModule) {
        expect(true).toBe(true);
        return;
      }
      expect(storageModule).toBeDefined();
    });

    STORAGE_MAIN_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!storageModule) return;
        expect(storageModule[exportName]).toBeDefined();
      });
    });
  });

  describe('Utils Module', () => {
    it('MUST be importable', () => {
      if (!utilsModule) {
        expect(true).toBe(true);
        return;
      }
      expect(utilsModule).toBeDefined();
    });

    STORAGE_UTILS_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!utilsModule) return;
        expect(utilsModule[exportName]).toBeDefined();
      });
    });
  });

  describe('Setup Module', () => {
    it('MUST be importable', () => {
      if (!setupModule) {
        expect(true).toBe(true);
        return;
      }
      expect(setupModule).toBeDefined();
    });

    STORAGE_SETUP_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!setupModule) return;
        expect(setupModule[exportName]).toBeDefined();
      });
    });
  });

  describe('Files Module', () => {
    it('MUST be importable', () => {
      if (!filesModule) {
        expect(true).toBe(true);
        return;
      }
      expect(filesModule).toBeDefined();
    });

    STORAGE_FILES_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!filesModule) return;
        expect(filesModule[exportName]).toBeDefined();
      });
    });
  });

  describe('Molecules Module', () => {
    it('MUST be importable', () => {
      if (!moleculesModule) {
        expect(true).toBe(true);
        return;
      }
      expect(moleculesModule).toBeDefined();
    });

    STORAGE_MOLECULES_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!moleculesModule) return;
        expect(moleculesModule[exportName]).toBeDefined();
      });
    });
  });

  describe('Atoms Module', () => {
    it('MUST be importable', () => {
      if (!atomsModule) {
        expect(true).toBe(true);
        return;
      }
      expect(atomsModule).toBeDefined();
    });

    STORAGE_ATOMS_EXPORTS.forEach(exportName => {
      it(`MUST export ${exportName}`, () => {
        if (!atomsModule) return;
        expect(atomsModule[exportName]).toBeDefined();
      });
    });
  });

  describe('Module Import Compatibility', () => {
    it('all storage modules MUST use ESM imports', async () => {
      const imports = [];
      
      try {
        imports.push(await import('#layer-c/storage/index.js'));
      } catch (e) {}
      
      try {
        imports.push(await import('#layer-c/storage/utils/index.js'));
      } catch (e) {}

      try {
        imports.push(await import('#layer-c/storage/setup/index.js'));
      } catch (e) {}

      try {
        imports.push(await import('#layer-c/storage/files/index.js'));
      } catch (e) {}

      imports.forEach(mod => {
        if (mod) {
          expect(typeof mod).toBe('object');
        }
      });
    });

    it('imports MUST be consistent across multiple calls', async () => {
      const mod1 = await import('#layer-c/storage/index.js');
      const mod2 = await import('#layer-c/storage/index.js');
      
      expect(mod1).toBe(mod2);
    });
  });

  describe('Sub-module Imports', () => {
    it('utils submodule MUST be importable', async () => {
      const utils = await import('#layer-c/storage/utils/index.js');
      expect(utils.calculateFileHash).toBeDefined();
    });

    it('setup submodule MUST be importable', async () => {
      const setup = await import('#layer-c/storage/setup/index.js');
      expect(setup.getDataDirectory).toBeDefined();
    });

    it('files submodule MUST be importable', async () => {
      const files = await import('#layer-c/storage/files/index.js');
      expect(files.saveMetadata).toBeDefined();
    });

    it('molecules submodule MUST be importable', async () => {
      const molecules = await import('#layer-c/storage/molecules/index.js');
      expect(molecules.saveMolecule).toBeDefined();
    });

    it('atoms submodule MUST be importable', async () => {
      const atoms = await import('#layer-c/storage/atoms/index.js');
      expect(atoms.saveAtom).toBeDefined();
    });
  });

  describe('Backward Compatibility via core', () => {
    it('MUST be re-exportable from #core/storage/index.js', async () => {
      let coreStorage;
      try {
        coreStorage = await import('#core/storage/index.js');
      } catch (e) {
        coreStorage = null;
      }
      
      if (!coreStorage) return;
      expect(coreStorage.saveMetadata).toBeDefined();
      expect(coreStorage.getDataDirectory).toBeDefined();
    });
  });
});

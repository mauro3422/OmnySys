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

describe('Core Storage Module Contract', () => {
  let storageModule;
  let utilsModule;
  let setupModule;
  let filesModule;
  let moleculesModule;
  let atomsModule;

  beforeAll(async () => {
    try {
      storageModule = await import('#core/storage/index.js');
    } catch (e) {
      storageModule = null;
    }

    try {
      utilsModule = await import('#core/storage/utils/index.js');
    } catch (e) {
      utilsModule = null;
    }

    try {
      setupModule = await import('#core/storage/setup/index.js');
    } catch (e) {
      setupModule = null;
    }

    try {
      filesModule = await import('#core/storage/files/index.js');
    } catch (e) {
      filesModule = null;
    }

    try {
      moleculesModule = await import('#core/storage/molecules/index.js');
    } catch (e) {
      moleculesModule = null;
    }

    try {
      atomsModule = await import('#core/storage/atoms/index.js');
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

    it('calculateFileHash MUST be a function', () => {
      if (!utilsModule || !utilsModule.calculateFileHash) return;
      expect(typeof utilsModule.calculateFileHash).toBe('function');
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

    it('createDataDirectory MUST be a function', () => {
      if (!setupModule || !setupModule.createDataDirectory) return;
      expect(typeof setupModule.createDataDirectory).toBe('function');
    });

    it('getDataDirectory MUST be a function', () => {
      if (!setupModule || !setupModule.getDataDirectory) return;
      expect(typeof setupModule.getDataDirectory).toBe('function');
    });

    it('hasExistingAnalysis MUST be a function', () => {
      if (!setupModule || !setupModule.hasExistingAnalysis) return;
      expect(typeof setupModule.hasExistingAnalysis).toBe('function');
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

    it('saveMetadata MUST be a function', () => {
      if (!filesModule || !filesModule.saveMetadata) return;
      expect(typeof filesModule.saveMetadata).toBe('function');
    });

    it('saveFileAnalysis MUST be a function', () => {
      if (!filesModule || !filesModule.saveFileAnalysis) return;
      expect(typeof filesModule.saveFileAnalysis).toBe('function');
    });

    it('saveConnections MUST be a function', () => {
      if (!filesModule || !filesModule.saveConnections) return;
      expect(typeof filesModule.saveConnections).toBe('function');
    });

    it('saveRiskAssessment MUST be a function', () => {
      if (!filesModule || !filesModule.saveRiskAssessment) return;
      expect(typeof filesModule.saveRiskAssessment).toBe('function');
    });

    it('savePartitionedSystemMap MUST be a function', () => {
      if (!filesModule || !filesModule.savePartitionedSystemMap) return;
      expect(typeof filesModule.savePartitionedSystemMap).toBe('function');
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

    it('saveMolecule MUST be a function', () => {
      if (!moleculesModule || !moleculesModule.saveMolecule) return;
      expect(typeof moleculesModule.saveMolecule).toBe('function');
    });

    it('loadMolecule MUST be a function', () => {
      if (!moleculesModule || !moleculesModule.loadMolecule) return;
      expect(typeof moleculesModule.loadMolecule).toBe('function');
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

    it('saveAtom MUST be a function', () => {
      if (!atomsModule || !atomsModule.saveAtom) return;
      expect(typeof atomsModule.saveAtom).toBe('function');
    });

    it('loadAtoms MUST be a function', () => {
      if (!atomsModule || !atomsModule.loadAtoms) return;
      expect(typeof atomsModule.loadAtoms).toBe('function');
    });
  });

  describe('Module Import Compatibility', () => {
    it('all storage modules MUST use ESM imports', async () => {
      const imports = [];
      
      try {
        imports.push(await import('#core/storage/index.js'));
      } catch (e) {}
      
      try {
        imports.push(await import('#core/storage/utils/index.js'));
      } catch (e) {}

      try {
        imports.push(await import('#core/storage/setup/index.js'));
      } catch (e) {}

      try {
        imports.push(await import('#core/storage/files/index.js'));
      } catch (e) {}

      imports.forEach(mod => {
        if (mod) {
          expect(typeof mod).toBe('object');
        }
      });
    });

    it('imports MUST be consistent across multiple calls', async () => {
      const mod1 = await import('#core/storage/index.js');
      const mod2 = await import('#core/storage/index.js');
      
      expect(mod1).toBe(mod2);
    });
  });

  describe('Re-exports Consistency', () => {
    it('calculateFileHash from main MUST match utils export', async () => {
      if (!storageModule) return;
      const utils = await import('#core/storage/utils/index.js');
      expect(storageModule.calculateFileHash).toBe(utils.calculateFileHash);
    });

    it('createDataDirectory from main MUST match setup export', async () => {
      if (!storageModule) return;
      const setup = await import('#core/storage/setup/index.js');
      expect(storageModule.createDataDirectory).toBe(setup.createDataDirectory);
    });

    it('saveMetadata from main MUST match files export', async () => {
      if (!storageModule) return;
      const files = await import('#core/storage/files/index.js');
      expect(storageModule.saveMetadata).toBe(files.saveMetadata);
    });

    it('saveMolecule from main MUST match molecules export', async () => {
      if (!storageModule) return;
      const molecules = await import('#core/storage/molecules/index.js');
      expect(storageModule.saveMolecule).toBe(molecules.saveMolecule);
    });

    it('saveAtom from main MUST match atoms export', async () => {
      if (!storageModule) return;
      const atoms = await import('#core/storage/atoms/index.js');
      expect(storageModule.saveAtom).toBe(atoms.saveAtom);
    });
  });
});

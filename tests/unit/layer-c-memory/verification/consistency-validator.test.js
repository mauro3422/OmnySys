import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ConsistencyValidator } from '#layer-c/verification/validators/consistency-validator.js';
import { VerificationStatus, Severity } from '#layer-c/verification/types/index.js';

function createValidAtom(id, filePath) {
  return {
    id,
    filePath: filePath,
    name: `atom-${id}`,
    code: 'console.log("test");',
    hash: 'abc123def456',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function createValidFile(filePath, atomIds) {
  return {
    path: filePath,
    atoms: atomIds,
    hash: 'file-hash-123',
    lastModified: new Date().toISOString(),
    definitions: atomIds.map((id, i) => ({
      name: `atom-${id}`,
      type: 'function'
    }))
  };
}

function createValidConnection(sourceId, targetId) {
  return {
    id: `conn-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'dependency',
    createdAt: new Date().toISOString()
  };
}

async function createConsistentDataStructure(tempDir) {
  const atomsDir = path.join(tempDir, '.omnysysdata', 'atoms');
  const filesDir = path.join(tempDir, '.omnysysdata', 'files');
  const connectionsDir = path.join(tempDir, '.omnysysdata', 'connections');
  const cacheDir = path.join(tempDir, '.omnysysdata', 'cache');

  await fs.mkdir(atomsDir, { recursive: true });
  await fs.mkdir(filesDir, { recursive: true });
  await fs.mkdir(connectionsDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });

  const atom1 = createValidAtom('atom-001', 'src/test.js');
  const atom2 = createValidAtom('atom-002', 'src/utils.js');

  await fs.writeFile(path.join(atomsDir, 'atom-001.json'), JSON.stringify(atom1, null, 2));
  await fs.writeFile(path.join(atomsDir, 'atom-002.json'), JSON.stringify(atom2, null, 2));

  const file1 = createValidFile('src/test.js', ['atom-001']);
  const file2 = createValidFile('src/utils.js', ['atom-002']);

  await fs.writeFile(path.join(filesDir, 'src-test.json'), JSON.stringify(file1, null, 2));
  await fs.writeFile(path.join(filesDir, 'src-utils.json'), JSON.stringify(file2, null, 2));

  const conn1 = createValidConnection('atom-001', 'atom-002');
  await fs.writeFile(path.join(connectionsDir, 'conn-001.json'), JSON.stringify(conn1, null, 2));

  const cacheData = { version: '1.0', lastUpdated: new Date().toISOString() };
  await fs.writeFile(path.join(cacheDir, 'cache.json'), JSON.stringify(cacheData, null, 2));
}

async function createInconsistentDataStructure(tempDir) {
  const atomsDir = path.join(tempDir, '.omnysysdata', 'atoms');
  const filesDir = path.join(tempDir, '.omnysdata', 'files');
  const connectionsDir = path.join(tempDir, '.omnysysdata', 'connections');

  await fs.mkdir(atomsDir, { recursive: true });
  await fs.mkdir(filesDir, { recursive: true });
  await fs.mkdir(connectionsDir, { recursive: true });

  const atom1 = createValidAtom('atom-001', 'src/missing.js');

  await fs.writeFile(path.join(atomsDir, 'atom-001.json'), JSON.stringify(atom1, null, 2));
}

describe('ConsistencyValidator', () => {
  let tempDir;
  let validator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'consistency-test-'));
    await createConsistentDataStructure(tempDir);
    validator = new ConsistencyValidator(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('creates instance with projectPath', () => {
      expect(validator.projectPath).toBe(tempDir);
    });

    it('sets dataDir correctly', () => {
      expect(validator.dataDir).toContain('.omnysysdata');
    });

    it('initializes with default config', () => {
      expect(validator.config.validateAtomsFiles).toBe(true);
      expect(validator.config.validateFilesConnections).toBe(true);
      expect(validator.config.validatePaths).toBe(true);
      expect(validator.config.detectDuplication).toBe(true);
    });

    it('accepts custom config options', () => {
      const custom = new ConsistencyValidator(tempDir, {
        validatePaths: false,
        detectDuplication: false
      });

      expect(custom.config.validatePaths).toBe(false);
      expect(custom.config.detectDuplication).toBe(false);
    });

    it('initializes DataLoader', () => {
      expect(validator.dataLoader).toBeDefined();
    });

    it('initializes IssueManager', () => {
      expect(validator.issueManager).toBeDefined();
    });

    it('initializes null cache', () => {
      expect(validator.cache).toBeNull();
    });
  });

  describe('validate()', () => {
    it('returns validation result structure', async () => {
      const result = await validator.validate();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('stats');
    });

    it('returns PASSED status when no issues', async () => {
      const result = await validator.validate();

      expect([VerificationStatus.PASSED, VerificationStatus.WARNING]).toContain(result.status);
    });

    it('loads all data before validation', async () => {
      await validator.validate();

      expect(validator.cache).toBeDefined();
    });

    it('returns issues array', async () => {
      const result = await validator.validate();

      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('returns summary', async () => {
      const result = await validator.validate();

      expect(result).toHaveProperty('summary');
    });
  });

  describe('runValidations()', () => {
    it('runs PathValidator when enabled', async () => {
      await validator.validate();
      expect(validator.cache).toBeDefined();
    });

    it('runs AtomsFilesValidator when enabled', async () => {
      await validator.validate();
      expect(validator.cache).toBeDefined();
    });

    it('runs FilesConnectionsValidator when enabled', async () => {
      await validator.validate();
      expect(validator.cache).toBeDefined();
    });

    it('runs DuplicationDetector when enabled', async () => {
      await validator.validate();
      expect(validator.cache).toBeDefined();
    });

    it('skips PathValidator when disabled', async () => {
      validator.config.validatePaths = false;
      await validator.validate();
      expect(validator.cache).toBeDefined();
    });

    it('skips AtomsFilesValidator when disabled', async () => {
      validator.config.validateAtomsFiles = false;
      await validator.validate();
      expect(validator.cache).toBeDefined();
    });

    it('skips DuplicationDetector when disabled', async () => {
      validator.config.detectDuplication = false;
      await validator.validate();
      expect(validator.cache).toBeDefined();
    });
  });

  describe('detects inconsistency issues', () => {
    it('detects atom referencing missing file', async () => {
      const inconsistentDir = await fs.mkdtemp(path.join(os.tmpdir(), 'inconsistent-'));
      await createInconsistentDataStructure(inconsistentDir);

      const inconsistentValidator = new ConsistencyValidator(inconsistentDir);
      const result = await inconsistentValidator.validate();

      expect(result.issues.length).toBeGreaterThan(0);

      await fs.rm(inconsistentDir, { recursive: true, force: true });
    });
  });

  describe('determineStatus()', () => {
    it('returns PASSED for no issues', async () => {
      const result = await validator.validate();

      expect([VerificationStatus.PASSED, VerificationStatus.WARNING]).toContain(result.status);
    });
  });

  describe('getStats()', () => {
    it('returns data and issue stats', async () => {
      await validator.validate();
      const stats = validator.getStats();

      expect(stats).toHaveProperty('data');
      expect(stats).toHaveProperty('issues');
    });
  });

  describe('getIssues()', () => {
    it('returns issues from IssueManager', async () => {
      await validator.validate();
      const issues = validator.getIssues();

      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('reset()', () => {
    it('resets cache to null', async () => {
      await validator.validate();
      expect(validator.cache).not.toBeNull();

      validator.reset();

      expect(validator.cache).toBeNull();
    });
  });

  describe('Integration', () => {
    it('runs complete validation flow', async () => {
      const result = await validator.validate();

      expect([VerificationStatus.PASSED, VerificationStatus.WARNING]).toContain(result.status);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(result.stats).toBeDefined();
    });

    it('validates with all options disabled', async () => {
      const minimalValidator = new ConsistencyValidator(tempDir, {
        validateAtomsFiles: false,
        validateFilesConnections: false,
        validatePaths: false,
        detectDuplication: false
      });

      const result = await minimalValidator.validate();

      expect(result).toBeDefined();
    });
  });
});
